"""FASE 18 verification — member card background CMS, stats, security (sandbox DB, dropped).

Run: cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase18_verify.py
"""
import asyncio
import os

SANDBOX_DB = "alsabbat_phase18_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

results = []
BG_KEY = "member.card.background_url"


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        hadm = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        async def register(email, name):
            return await c.post(
                "/baraya/register",
                json={
                    "full_name": name,
                    "email": email,
                    "phone": "+628123456789",
                    "password": "Sandbox123",
                    "password_confirmation": "Sandbox123",
                },
            )

        ra = await register("a18@sandbox-alsabbat.dev", "Baraya Sandbox A")
        rb = await register("b18@sandbox-alsabbat.dev", "Baraya Sandbox B")
        # Fase 3: akun baru harus terverifikasi email sebelum bisa login.
        await get_db()["customers"].update_many({}, {"$set": {"email_verified": True}})
        ha = {"Authorization": f"Bearer {(await c.post('/baraya/login', json={'email': 'a18@sandbox-alsabbat.dev', 'password': 'Sandbox123'})).json()['access_token']}"}
        hb = {"Authorization": f"Bearer {(await c.post('/baraya/login', json={'email': 'b18@sandbox-alsabbat.dev', 'password': 'Sandbox123'})).json()['access_token']}"}
        card_a = (await c.get("/baraya/member-card", headers=ha)).json()
        num_a, code_a = card_a["member_number"], card_a["member_code"]

        # ---- M18-01 background dari Media Library
        media = await c.post(
            "/media",
            json={"file_name": "latar-kartu.jpg", "file_type": "IMAGE", "mime_type": "image/jpeg", "url": "/api/media/files/latar-kartu.jpg"},
            headers=hadm,
        )
        bg = media.json()["url"]
        saved = await c.put(
            "/site-content/bulk",
            json={"items": [{"key": BG_KEY, "value": bg, "label": "Latar Kartu (URL gambar)", "group": "Kartu Member"}]},
            headers=hadm,
        )
        check("M18-01 admin memilih latar dari Media Library", media.status_code == 201 and saved.status_code == 200, saved.text[:120])

        pub = (await c.get("/site-content/public")).json()["items"]
        check("M18-02/03 latar tersedia untuk pratinjau Admin & kartu publik (sumber sama)", pub.get(BG_KEY) == bg)
        check("M18-05 latar tidak mengubah data member",
              (await c.get("/baraya/member-card", headers=ha)).json()["member_number"] == num_a
              and (await c.get("/baraya/member-card", headers=ha)).json()["member_code"] == code_a)
        check("M18-06 QR tetap valid setelah latar diganti",
              (await c.get(f"/member/verify/{code_a}")).json()["valid"] is True)

        reset = await c.put("/site-content/bulk", json={"items": [{"key": BG_KEY, "value": ""}]}, headers=hadm)
        check("M18-04 reset mengembalikan latar default",
              reset.status_code == 200 and BG_KEY not in (await c.get("/site-content/public")).json()["items"])

        # ---- security
        check("M18-02b latar hanya bisa diubah dengan izin konten (customer ditolak)",
              (await c.put("/site-content/bulk", json={"items": [{"key": BG_KEY, "value": "https://jahat.test/x.jpg"}]}, headers=ha)).status_code in (401, 403))
        check("M18-02c unauth tidak bisa mengubah latar",
              (await c.put("/site-content/bulk", json={"items": [{"key": BG_KEY, "value": "x"}]})).status_code in (401, 403))
        check("M18-07 customer B tidak bisa melihat kartu A",
              (await c.get(f"/baraya/admin/{ra.json()['customer']['id']}/member-card", headers=hb)).status_code in (401, 403))
        await c.patch("/baraya/me", json={"member_number": "ALS-999999", "member_code": "curang", "status": "INACTIVE"}, headers=ha)
        after = (await c.get("/baraya/member-card", headers=ha)).json()
        check("M18-08 customer tidak bisa mengubah nomor/member_code/status",
              after["member_number"] == num_a and after["member_code"] == code_a and after["status"] == "ACTIVE")
        adm_card = await c.get(f"/baraya/admin/{ra.json()['customer']['id']}/member-card", headers=hadm)
        check("M18-09 pratinjau admin tanpa password/token",
              adm_card.status_code == 200 and "password" not in adm_card.text.lower() and "token" not in adm_card.text.lower())

        # ---- foto profil: validasi
        checks = {
            "javascript:alert(1)": 422,
            "http://insecure.test/a.jpg": 422,
            "https://cdn.sandbox.dev/a.svg": 422,
            "https://cdn.sandbox.dev/evil.html": 422,
            "https://cdn.sandbox.dev/foto.jpg": 200,
        }
        ok = True
        for url, expected in checks.items():
            r = await c.patch("/baraya/me", json={"photo_url": url}, headers=ha)
            if r.status_code != expected:
                ok = False
                print(f"   photo_url {url} -> {r.status_code} (harap {expected})")
        check("F1 validasi foto profil (tolak javascript:/http/SVG/HTML, terima JPG https)", ok)
        check("F2 foto hanya milik sendiri (kartu B tidak berubah)",
              (await c.get("/baraya/member-card", headers=hb)).json()["photo_url"] in (None, ""))

        # ---- statistik nyata
        stats = await c.get("/baraya/admin/stats", headers=hadm)
        sj = stats.json()
        check("S1 statistik Baraya nyata (total/aktif/nonaktif/baru)",
              stats.status_code == 200 and sj["total"] == 2 and sj["active"] == 2 and sj["inactive"] == 0 and sj["new_this_month"] == 2, str(sj))
        await c.patch(f"/baraya/admin/{rb.json()['customer']['id']}/status", json={"status": "INACTIVE"}, headers=hadm)
        sj2 = (await c.get("/baraya/admin/stats", headers=hadm)).json()
        check("S2 statistik mengikuti perubahan status", sj2["active"] == 1 and sj2["inactive"] == 1, str(sj2))
        check("S3 statistik butuh RBAC", (await c.get("/baraya/admin/stats")).status_code in (401, 403))

        # ---- regresi
        for path in ("/health", "/club", "/players", "/staff", "/matches", "/content/posts",
                     "/merchandise/products", "/sponsors", "/banners/public", "/site-content/public"):
            r = await c.get(path)
            check(f"R {path} still 200", r.status_code == 200, str(r.status_code))
        # Sejak Fase 3 galeri hanya untuk Pemain & Staf → 403 untuk Guest/Member.
        check("R galeri terkunci untuk Guest (403, aturan Fase 3)",
              (await c.get("/gallery/public/albums")).status_code == 403)
        check("R member verify masih jalan", (await c.get(f"/member/verify/{code_a}")).json()["member_number"] == num_a)
        check("R admin auth & baraya auth tetap terpisah",
              (await c.get("/baraya/me", headers=hadm)).status_code in (401, 403)
              and (await c.get("/users", headers=ha)).status_code in (401, 403))
        check("M18-15 tidak ada gambar binary di MongoDB (hanya URL)",
              await db[Collections.SITE_CONTENT].count_documents({"value": {"$regex": "^data:"}}) == 0)

    await get_client().drop_database(SANDBOX_DB)
    check("Z sandbox database dropped", SANDBOX_DB not in await get_client().list_database_names())

    passed = sum(1 for _, ok_ in results if ok_)
    print(f"\n{passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
