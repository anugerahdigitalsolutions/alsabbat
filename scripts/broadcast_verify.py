"""Verifikasi fitur Broadcast (Admin Panel) — database sandbox sekali-pakai.

Nol tulisan ke database preview/staging/produksi: memakai database
`alsabbat_broadcast_sandbox` yang di-DROP di akhir skrip.

Jalankan:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/broadcast_verify.py
"""
import asyncio
import os
from datetime import timedelta

SANDBOX_DB = "alsabbat_broadcast_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ["BROADCAST_SCHEDULER_ENABLED"] = "false"  # scheduler diuji manual

import httpx  # noqa: E402
from fastapi.encoders import jsonable_encoder  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.base import new_id, utcnow  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

results = []
PASSWORD = "Sandbox123"


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def seed_customers(db):
    """Akun uji hanya di database sandbox."""
    people = [
        ("member.satu", ["MEMBER"], "MEMBER"),
        ("member.dua", ["MEMBER"], "MEMBER"),
        ("pemain.satu", ["PEMAIN"], "PEMAIN"),
        ("staff.satu", ["STAFF"], "STAFF"),
        ("pemainstaff.satu", ["PEMAIN", "STAFF"], "STAFF"),
        ("nonaktif.satu", ["MEMBER"], "MEMBER"),
    ]
    ids = {}
    for slug, roles, primary in people:
        doc_id = new_id()
        ids[slug] = doc_id
        await db[Collections.CUSTOMERS].insert_one(
            {
                "id": doc_id,
                "email": f"{slug}@sandbox-alsabbat.dev",
                "full_name": slug.replace(".", " ").title(),
                "phone": "+628123456700",
                "password_hash": hash_password(PASSWORD),
                "status": "INACTIVE" if slug.startswith("nonaktif") else "ACTIVE",
                "role": primary,
                "roles": roles,
                "email_verified": True,
                "auth_provider": "PASSWORD",
                "created_at": jsonable_encoder(utcnow()),
                "updated_at": jsonable_encoder(utcnow()),
            }
        )
    # Akun lama (sebelum multi-role) tanpa field `roles` — backward compatibility.
    legacy_id = new_id()
    ids["legacy.pemain"] = legacy_id
    await db[Collections.CUSTOMERS].insert_one(
        {
            "id": legacy_id,
            "email": "legacy.pemain@sandbox-alsabbat.dev",
            "full_name": "Legacy Pemain",
            "phone": "+628123456701",
            "password_hash": hash_password(PASSWORD),
            "status": "ACTIVE",
            "role": "PEMAIN",
            "email_verified": True,
            "created_at": jsonable_encoder(utcnow()),
            "updated_at": jsonable_encoder(utcnow()),
        }
    )
    return ids


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()
    ids = await seed_customers(db)

    from app.main import app  # import setelah env sandbox disetel

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://sandbox/api", timeout=60
    ) as c:
        # ------------------------------------------------------------ RBAC
        anon = await c.get("/broadcasts")
        check("GET /broadcasts tanpa token → 401", anon.status_code == 401, str(anon.status_code))

        admin = await c.post(
            "/auth/login",
            json={
                "email": settings.BOOTSTRAP_ADMIN_EMAIL,
                "password": settings.BOOTSTRAP_ADMIN_PASSWORD,
            },
        )
        check("login admin", admin.status_code == 200, str(admin.status_code))
        ah = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        # ------------------------------------------------ jumlah penerima
        counts = await c.get("/broadcasts/recipient-counts", headers=ah)
        data = counts.json()
        check(
            "ALL_MEMBERS = semua akun aktif (6)",
            data.get("ALL_MEMBERS") == 6,
            str(data.get("ALL_MEMBERS")),
        )
        check("MEMBERS_ONLY = member saja (2)", data.get("MEMBERS_ONLY") == 2, str(data.get("MEMBERS_ONLY")))
        check(
            "PLAYERS_ONLY = pemain incl. legacy & multi-role (3)",
            data.get("PLAYERS_ONLY") == 3,
            str(data.get("PLAYERS_ONLY")),
        )
        check(
            "PLAYERS_AND_STAFF = pemain/staff (4)",
            data.get("PLAYERS_AND_STAFF") == 4,
            str(data.get("PLAYERS_AND_STAFF")),
        )

        # ------------------------------------------------------ send now
        now_res = await c.post(
            "/broadcasts",
            headers=ah,
            json={
                "title": "Uji Kirim Sekarang",
                "message": "Isi pesan uji broadcast.",
                "recipient_group": "PLAYERS_ONLY",
                "delivery_type": "SEND_NOW",
            },
        )
        check("POST /broadcasts SEND_NOW → 201", now_res.status_code == 201, str(now_res.status_code))
        sent = now_res.json()
        check("status SENT", sent.get("status") == "SENT", str(sent.get("status")))
        check("sent_at terisi", bool(sent.get("sent_at")))
        check(
            "notification_count = 3 penerima pemain",
            sent.get("notification_count") == 3,
            str(sent.get("notification_count")),
        )

        notif_query = {"reference_type": "broadcast", "reference_id": sent["id"]}
        recipients = sorted(
            [d["recipient_id"] async for d in db[Collections.NOTIFICATIONS].find(notif_query, {"recipient_id": 1})]
        )
        expected = sorted([ids["pemain.satu"], ids["pemainstaff.satu"], ids["legacy.pemain"]])
        check("penerima notifikasi tepat (pemain saja)", recipients == expected)

        one = await db[Collections.NOTIFICATIONS].find_one(notif_query)
        check(
            "dokumen memakai struktur notifikasi existing",
            one.get("audience") == "CUSTOMER"
            and one.get("read") is False
            and one.get("read_by") == []
            and one.get("type") == "BROADCAST"
            and one.get("title") == "Uji Kirim Sekarang",
        )

        # notifikasi muncul di endpoint notifikasi user existing
        member_login = await c.post(
            "/baraya/login",
            json={"email": "pemain.satu@sandbox-alsabbat.dev", "password": PASSWORD},
        )
        mh = {"Authorization": f"Bearer {member_login.json()['access_token']}"}
        mine = await c.get("/baraya/notifications", headers=mh)
        body = mine.json()
        check(
            "muncul di GET /baraya/notifications (unread=1)",
            body.get("unread") == 1 and body["items"][0]["title"] == "Uji Kirim Sekarang",
            str(body.get("unread")),
        )

        # akun bukan penerima tidak menerima apa pun
        other = await c.post(
            "/baraya/login",
            json={"email": "member.satu@sandbox-alsabbat.dev", "password": PASSWORD},
        )
        oh = {"Authorization": f"Bearer {other.json()['access_token']}"}
        other_notifs = (await c.get("/baraya/notifications", headers=oh)).json()
        check("member bukan penerima tetap kosong", other_notifs.get("total") == 0)

        # ------------------------------------------------------ terjadwal
        future = jsonable_encoder(utcnow() + timedelta(hours=3))
        sch = await c.post(
            "/broadcasts",
            headers=ah,
            json={
                "title": "Uji Terjadwal",
                "message": "Pesan terjadwal.",
                "recipient_group": "MEMBERS_ONLY",
                "delivery_type": "SCHEDULED",
                "scheduled_at": future,
            },
        )
        check("POST /broadcasts SCHEDULED → 201", sch.status_code == 201, str(sch.status_code))
        scheduled = sch.json()
        check("status SCHEDULED", scheduled.get("status") == "SCHEDULED", str(scheduled.get("status")))
        check("scheduled_at tersimpan", bool(scheduled.get("scheduled_at")))
        check("belum ada sent_at", scheduled.get("sent_at") is None)

        pending = await c.post("/broadcasts/process-due", headers=ah)
        check(
            "process-due tidak mengirim sebelum waktunya",
            pending.json().get("processed") == 0,
            str(pending.json()),
        )
        count_before = await db[Collections.NOTIFICATIONS].count_documents(
            {"reference_type": "broadcast", "reference_id": scheduled["id"]}
        )
        check("belum ada notifikasi untuk broadcast terjadwal", count_before == 0)

        # majukan waktu jadwal → jatuh tempo
        await db[Collections.BROADCASTS].update_one(
            {"id": scheduled["id"]},
            {"$set": {"scheduled_at": jsonable_encoder(utcnow() - timedelta(minutes=1))}},
        )
        run1 = (await c.post("/broadcasts/process-due", headers=ah)).json()
        check("process-due mengirim saat jatuh tempo", run1.get("processed") == 1, str(run1))
        after1 = await db[Collections.NOTIFICATIONS].count_documents(
            {"reference_type": "broadcast", "reference_id": scheduled["id"]}
        )
        check("notifikasi terkirim ke 2 member", after1 == 2, str(after1))
        detail = (await c.get(f"/broadcasts/{scheduled['id']}", headers=ah)).json()
        check("status jadi SENT + sent_at", detail.get("status") == "SENT" and bool(detail.get("sent_at")))

        # ------------------------------------------- anti duplikasi (2 lapis)
        run2 = (await c.post("/broadcasts/process-due", headers=ah)).json()
        after2 = await db[Collections.NOTIFICATIONS].count_documents(
            {"reference_type": "broadcast", "reference_id": scheduled["id"]}
        )
        check("proses ulang tidak mengirim lagi", run2.get("processed") == 0 and after2 == 2, str(run2))

        # paksa jalur pengiriman ulang (simulasi proses macet) → tetap tidak duplikat
        from app.services import broadcast as bsvc

        await db[Collections.BROADCASTS].update_one(
            {"id": scheduled["id"]},
            {
                "$set": {
                    "status": "SENDING",
                    "claimed_at": jsonable_encoder(utcnow() - timedelta(minutes=30)),
                }
            },
        )
        again = await bsvc.deliver_one(scheduled["id"])
        after3 = await db[Collections.NOTIFICATIONS].count_documents(
            {"reference_type": "broadcast", "reference_id": scheduled["id"]}
        )
        check(
            "pengiriman ulang SENDING macet tetap idempoten",
            after3 == 2 and again.get("status") == "SENT" and again.get("notification_count") == 0,
            str(after3),
        )

        # ------------------------------------------------------- validasi
        bad1 = await c.post(
            "/broadcasts",
            headers=ah,
            json={
                "title": "Tanpa Jadwal",
                "message": "x pesan",
                "recipient_group": "ALL_MEMBERS",
                "delivery_type": "SCHEDULED",
            },
        )
        check("SCHEDULED tanpa tanggal → 422", bad1.status_code == 422, str(bad1.status_code))
        bad2 = await c.post(
            "/broadcasts",
            headers=ah,
            json={
                "title": "Jadwal Lampau",
                "message": "x pesan",
                "recipient_group": "ALL_MEMBERS",
                "delivery_type": "SCHEDULED",
                "scheduled_at": jsonable_encoder(utcnow() - timedelta(hours=1)),
            },
        )
        check("jadwal di masa lalu → 422", bad2.status_code == 422, str(bad2.status_code))

        history = (await c.get("/broadcasts", headers=ah)).json()
        check("riwayat berisi 2 broadcast", history.get("total") == 2, str(history.get("total")))

    # ------------------------------------------------------------- teardown
    await get_client().drop_database(SANDBOX_DB)
    remaining = await get_client().list_database_names()
    check("database sandbox dihapus", SANDBOX_DB not in remaining)

    failed = [name for name, ok in results if not ok]
    print("\n%d/%d checks passed" % (len(results) - len(failed), len(results)))
    if failed:
        print("FAILED: " + "; ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
