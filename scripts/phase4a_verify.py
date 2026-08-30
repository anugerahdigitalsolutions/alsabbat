"""FASE 4A verification — alur pengajuan Pemain (data pemain existing) & access control.

Sandbox database only (dropped at the end). Zero production writes, zero real email/push.
Run:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase4a_verify.py
"""
import asyncio
import os
import re

SANDBOX_DB = "alsabbat_phase4a_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ.pop("FIREBASE_PROJECT_ID", None)
os.environ.pop("FIREBASE_SERVICE_ACCOUNT_JSON", None)

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402
from app.services.mailer import get_mailer  # noqa: E402

results = []
EMAIL = "fase4a@sandbox-alsabbat.dev"
PASSWORD = "Sandbox123"


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()
    mailer = get_mailer()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        admin_login = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        ah = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        fb = await c.get("/baraya/admin/auth-settings", headers=ah)
        fbody = fb.json()
        check(
            "F4A-01 status Firebase jujur NOT_CONFIGURED & tanpa kredensial",
            fb.status_code == 200
            and fbody["firebase"]["configured"] is False
            and fbody["firebase"]["provider"] == "NOT_CONFIGURED"
            and "private_key" not in fb.text
            and "client_email" not in fb.text,
            fb.text[:140],
        )

        # akun member terverifikasi
        await c.post(
            "/baraya/register",
            json={
                "full_name": "Uji Fase 4A",
                "email": EMAIL,
                "phone": "+628123456700",
                "password": PASSWORD,
                "password_confirmation": PASSWORD,
            },
        )
        code = re.search(
            r"Kode verifikasi: (\d{6})",
            [m for m in mailer.outbox if m.to == EMAIL][-1].text,
        ).group(1)
        verify = await c.post("/baraya/otp/verify", json={"email": EMAIL, "code": code})
        mh = {"Authorization": f"Bearer {verify.json()['access_token']}"}
        check("F4A-02 akun Member siap (OTP Fase 3 tidak rusak)", verify.status_code == 200)

        # pengajuan tanpa data pemain ditolak
        base = {
            "type": "PEMAIN",
            "full_name": "Uji Fase 4A",
            "phone": "+628123456700",
            "motivation": "Ingin bergabung dan berkembang bersama AL SABBAT.",
        }
        missing = await c.post("/baraya/applications", json=base, headers=mh)
        check("F4A-03 pengajuan Pemain tanpa data pemain ditolak (422)", missing.status_code == 422, missing.text[:120])

        player_data = {
            "full_name": "Uji Fase 4A",
            "display_name": "UJI",
            "jersey_number": 21,
            "position": "FORWARD",
            "date_of_birth": "2000-05-17",
            "nationality": "Indonesia",
            "height_cm": 178,
            "weight_kg": 70,
            "bio": "Pemain sayap kanan.",
            "instagram": "@ujifase4a",
        }
        bad_position = await c.post(
            "/baraya/applications",
            json={**base, "player_data": {**player_data, "position": "STRIKER"}},
            headers=mh,
        )
        check("F4A-04 posisi di luar enum Pemain existing ditolak (422)", bad_position.status_code == 422)

        created = await c.post(
            "/baraya/applications", json={**base, "player_data": player_data}, headers=mh
        )
        cbody = created.json() if created.status_code < 500 else {}
        app_id = cbody.get("id")
        check(
            "F4A-05 pengajuan Pemain memakai field model Pemain existing",
            created.status_code == 201
            and cbody["status"] == "PENDING"
            and cbody["player_data"]["jersey_number"] == 21
            and cbody["player_data"]["position"] == "FORWARD",
            created.text[:180],
        )
        check(
            "F4A-06 notifikasi dilaporkan NOT_CONFIGURED (tanpa notifikasi palsu)",
            cbody.get("notification", {}).get("delivered") is False
            and cbody["notification"]["provider"] == "NOT_CONFIGURED",
        )

        guest = await c.post("/baraya/applications", json={**base, "player_data": player_data})
        check("F4A-07 Guest tidak dapat membuat pengajuan (401)", guest.status_code == 401)

        # admin melengkapi data sebelum approval
        edit = await c.patch(
            f"/baraya/admin/applications/{app_id}/data",
            json={"player_data": {"full_name": "Uji Fase 4A", "position": "MIDFIELDER", "jersey_number": 8}},
            headers=ah,
        )
        check(
            "F4A-08 Admin dapat melengkapi/mengoreksi data pengajuan",
            edit.status_code == 200
            and edit.json()["player_data"]["jersey_number"] == 8
            and edit.json()["player_data"]["position"] == "MIDFIELDER"
            and edit.json()["player_data"]["nationality"] == "Indonesia",
            edit.text[:180],
        )
        member_edit = await c.patch(
            f"/baraya/admin/applications/{app_id}/data", json={"phone": "+628000000000"}, headers=mh
        )
        check("F4A-09 Member tidak bisa memakai endpoint edit admin", member_edit.status_code in (401, 403))

        # record pemain existing (tanpa duplikat)
        club = await db[Collections.CLUBS].find_one({})
        team_res = await c.post("/teams", json={"club_id": club["id"], "name": "Tim Sandbox"}, headers=ah)
        team_id = team_res.json()["id"]
        player_res = await c.post(
            "/players",
            json={"team_id": team_id, "full_name": "Slot Pemain Lama", "position": "DEFENDER", "status": "ACTIVE"},
            headers=ah,
        )
        player_id = player_res.json()["id"]
        before = await db[Collections.PLAYERS].count_documents({})

        approve = await c.patch(
            f"/baraya/admin/applications/{app_id}",
            json={"decision": "APPROVED", "player_id": player_id},
            headers=ah,
        )
        after = await db[Collections.PLAYERS].count_documents({})
        player_doc = await db[Collections.PLAYERS].find_one({"id": player_id})
        check(
            "F4A-10 approve menautkan record existing & peran menjadi PEMAIN",
            approve.status_code == 200 and approve.json()["customer"]["role"] == "PEMAIN",
            approve.text[:160],
        )
        check("F4A-11 approve TIDAK membuat record pemain duplikat", before == after == 1, f"{before}->{after}")
        check(
            "F4A-12 data pengajuan yang disetujui menjadi data pemain website",
            player_doc["full_name"] == "Uji Fase 4A"
            and player_doc["jersey_number"] == 8
            and player_doc["position"] == "MIDFIELDER"
            and player_doc["height_cm"] == 178
            and player_doc["social_media"]["instagram"] == "@ujifase4a",
            str({k: player_doc.get(k) for k in ("full_name", "jersey_number", "position")}),
        )

        card = await c.get("/baraya/member-card", headers=mh)
        check("F4A-13 kartu member otomatis menampilkan PEMAIN", card.json()["role"] == "PEMAIN")
        gallery = await c.get("/gallery/public/albums", headers=mh)
        check("F4A-14 Pemain mendapat akses Galeri (200)", gallery.status_code == 200)

        # role sudah PEMAIN → tidak boleh mengajukan lagi
        again = await c.post(
            "/baraya/applications", json={**base, "player_data": player_data}, headers=mh
        )
        check("F4A-15 hanya MEMBER yang boleh mengajukan (403 untuk PEMAIN)", again.status_code == 403, again.text[:120])

        locked = await c.patch(
            f"/baraya/admin/applications/{app_id}/data", json={"phone": "+628111111111"}, headers=ah
        )
        check("F4A-16 pengajuan yang sudah diputuskan tidak dapat diedit (409)", locked.status_code == 409)

        # skenario REJECT + pengajuan ulang tanpa duplikat pemain
        await c.patch(
            f"/baraya/admin/{(await db[Collections.CUSTOMERS].find_one({'email': EMAIL}))['id']}/role",
            json={"role": "MEMBER"},
            headers=ah,
        )
        second = await c.post(
            "/baraya/applications", json={**base, "player_data": player_data}, headers=mh
        )
        second_id = second.json().get("id")
        reject = await c.patch(
            f"/baraya/admin/applications/{second_id}",
            json={"decision": "REJECTED", "note": "Data tinggi badan belum sesuai."},
            headers=ah,
        )
        mine = await c.get("/baraya/applications/mine", headers=mh)
        rows = mine.json()["items"]
        check(
            "F4A-17 REJECT mencatat status & catatan untuk pemohon",
            reject.status_code == 200
            and reject.json()["status"] == "REJECTED"
            and any(r["status"] == "REJECTED" and r["note"] for r in rows),
            reject.text[:140],
        )
        retry = await c.post(
            "/baraya/applications", json={**base, "player_data": player_data}, headers=mh
        )
        check("F4A-18 setelah REJECT pemohon dapat mengajukan ulang", retry.status_code == 201)
        check("F4A-19 riwayat lama tetap tercatat (tidak dihapus)", mine.json()["total"] >= 2, str(mine.json()["total"]))
        check(
            "F4A-20 jumlah record pemain tetap 1 (tanpa duplikat)",
            await db[Collections.PLAYERS].count_documents({}) == 1,
        )

        member_gallery = await c.get("/gallery/public/albums", headers=mh)
        guest_gallery = await c.get("/gallery/public/albums")
        check("F4A-21 Member (diturunkan) kembali 403 di Galeri", member_gallery.status_code == 403)
        check("F4A-22 Guest 403 di Galeri", guest_gallery.status_code == 403)

        for path in ("/club/active", "/players", "/matches", "/content/posts", "/health"):
            res = await c.get(path)
            check(f"F4A-23 regresi {path} tetap 200", res.status_code == 200, str(res.status_code))

    passed = sum(1 for _, ok_ in results if ok_)
    print(f"\n{passed}/{len(results)} PASS")
    await get_client().drop_database(SANDBOX_DB)
    print(f"sandbox database {SANDBOX_DB} dropped")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
