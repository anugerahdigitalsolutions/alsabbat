"""Verifikasi cleanup notifikasi Admin (DELETE /api/notifications/read).

Sandbox database only (di-drop di akhir). Tidak menulis apa pun ke database
production, tidak mengirim email/push.

Run:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/notif_cleanup_verify.py
"""
import asyncio
import os

SANDBOX_DB = "alsabbat_notifclean_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
# Kredensial admin khusus sandbox (database ini di-drop di akhir skrip).
os.environ["BOOTSTRAP_ADMIN_EMAIL"] = "notifclean.admin@sandbox-alsabbat.dev"
os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = "SandboxNotif123!"
os.environ["BOOTSTRAP_ADMIN_NAME"] = "Sandbox Notif Admin"
os.environ.pop("FIREBASE_PROJECT_ID", None)
os.environ.pop("FIREBASE_SERVICE_ACCOUNT_JSON", None)

import httpx  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import ensure_indexes, get_client  # noqa: E402
from app.main import app  # noqa: E402
from app.services import notification_center as center  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

results = []
OTHER_ADMIN = "admin.b@sandbox-alsabbat.dev"


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def seed(n=3):
    made = []
    for i in range(n):
        made.append(
            await center.create_notification(
                audience=center.AUDIENCE_ADMIN,
                type="VERIFY_CLEANUP",
                title=f"Notif uji {i + 1}",
                message="dokumen sandbox",
                link="/admin/baraya",
            )
        )
    return made


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()

    admin_email = settings.BOOTSTRAP_ADMIN_EMAIL
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        login = await c.post(
            "/auth/login",
            json={"email": admin_email, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        check("login admin 200", login.status_code == 200, str(login.status_code))
        token = login.json().get("access_token")
        ah = {"Authorization": f"Bearer {token}"}

        made = await seed(3)
        # Admin A membaca 2 dari 3; 1 tetap unread.
        for doc in made[:2]:
            r = await c.patch(f"/notifications/{doc['id']}/read", headers=ah)
            assert r.status_code == 200, r.text
        # Admin B (akun lain) membaca notifikasi yang berbeda -> tidak boleh terpengaruh.
        await center.mark_admin_read(made[2]["id"], OTHER_ADMIN)

        before = await c.get("/notifications", headers=ah)
        check("list awal 3 item", len(before.json()["items"]) == 3, str(len(before.json()["items"])))
        check("unread awal 1", before.json()["unread"] == 1, str(before.json()["unread"]))

        # Tanpa token -> harus ditolak (authorization tetap berlaku).
        anon = await c.request("DELETE", "/notifications/read")
        check("tanpa token ditolak", anon.status_code in (401, 403), str(anon.status_code))

        res = await c.request("DELETE", "/notifications/read", headers=ah)
        check("delete 200", res.status_code == 200, str(res.status_code))
        body = res.json()
        check("terhapus tepat 2 (yang sudah dibaca)", body.get("deleted") == 2, str(body.get("deleted")))
        check("unread setelah delete tetap 1", body.get("unread") == 1, str(body.get("unread")))

        after = await c.get("/notifications", headers=ah)
        items = after.json()["items"]
        check("list tersisa 1 item", len(items) == 1, str(len(items)))
        check("item tersisa adalah yang UNREAD", items and items[0]["read"] is False)
        check("item tersisa id benar", items and items[0]["id"] == made[2]["id"])
        check("badge unread tetap akurat", after.json()["unread"] == 1, str(after.json()["unread"]))

        count = await c.get("/notifications/unread-count", headers=ah)
        check("unread-count tetap 1", count.json()["unread"] == 1, str(count.json()["unread"]))

        # Dokumen unread tidak dihapus dari database.
        raw_unread = await center.repo.get(made[2]["id"])
        check("dokumen unread masih ada di DB", raw_unread is not None)
        check("field cleared_by tidak berisi admin A pada dokumen unread",
              admin_email not in (raw_unread.get("cleared_by") or []))

        # Isolasi antar admin: riwayat Admin B tetap utuh (3 dokumen).
        b_items, _, b_unread = await center.list_admin(OTHER_ADMIN, limit=30)
        check("riwayat admin lain tetap 3 item", len(b_items) == 3, str(len(b_items)))
        check("unread admin lain tetap 2", b_unread == 2, str(b_unread))

        # Klik kedua saat tidak ada notifikasi terbaca -> aman, 0 terhapus.
        again = await c.request("DELETE", "/notifications/read", headers=ah)
        check("delete kedua aman (0 terhapus)", again.json().get("deleted") == 0, str(again.json()))

        # Regresi endpoint notifikasi existing.
        mark_all = await c.post("/notifications/read-all", headers=ah)
        check("read-all tetap 200", mark_all.status_code == 200, str(mark_all.status_code))
        final = await c.get("/notifications", headers=ah)
        check("setelah read-all unread 0", final.json()["unread"] == 0, str(final.json()["unread"]))
        check("read-all tidak menghapus item", len(final.json()["items"]) == 1)

        for path in ("/health", "/players", "/club/active"):
            r = await c.get(path)
            check(f"regresi {path} 200", r.status_code == 200, str(r.status_code))

    passed = sum(1 for _, ok_ in results if ok_)
    print(f"\n{passed}/{len(results)} PASS")
    await get_client().drop_database(SANDBOX_DB)
    print(f"sandbox database {SANDBOX_DB} dropped")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
