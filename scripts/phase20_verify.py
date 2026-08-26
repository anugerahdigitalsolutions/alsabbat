"""FASE 20 verification — universal media upload & storage (sandbox DB, dropped).

Menolak berjalan bila DB bukan sandbox. Upload nyata memakai provider aktif
(MEDIA_STORAGE_PROVIDER), metadata masuk DB sandbox saja.
Run: cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase20_verify.py
"""
import asyncio
import io
import os

SANDBOX_DB = "alsabbat_phase20_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"

import httpx  # noqa: E402
from PIL import Image  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402
from app.services.media_service import media_service  # noqa: E402

results = []


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


def png_bytes(color=(1, 40, 145), size=(400, 300)):
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, "PNG")
    return buffer.getvalue()


async def main():
    if settings.DB_NAME != SANDBOX_DB or "sandbox" not in settings.DB_NAME:
        raise SystemExit(f"REFUSED: database bukan sandbox ({settings.DB_NAME})")

    await ensure_indexes()
    await run_bootstrap()
    db = get_db()
    uploaded_keys = []

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=120) as c:
        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        h = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        status = (await c.get("/media/storage/status", headers=h)).json()
        check("S1 provider storage terkonfigurasi & persisten", status["configured"] and status["persistent"], str(status["provider"]))
        check("S2 SVG tidak lagi diizinkan sebagai gambar", "image/svg+xml" not in status["allowed_mime_types"]["IMAGE"])

        async def upload(name, content, mime, headers=None):
            return await c.post(
                "/media/upload",
                files={"file": (name, content, mime)},
                headers=headers if headers is not None else h,
            )

        up = await upload("uji-desktop.png", png_bytes(), "image/png")
        check("U1 upload gambar (desktop) berhasil", up.status_code == 201, up.text[:140])
        media = up.json()
        uploaded_keys.append(media["storage_key"])
        check("U2 metadata lengkap (url/mime/size/dimensi/provider)",
              all(media.get(k) for k in ("url", "mime_type", "file_size", "width", "height", "storage_provider")), str(media.get("width")))
        check("U3 binary tidak disimpan di MongoDB",
              not any(isinstance(v, (bytes, bytearray)) for v in media.values()))
        served = await c.get(media["url"].replace("/api", "", 1))
        check("U4 berkas dapat dibaca kembali dari storage", served.status_code == 200 and len(served.content) > 100, str(served.status_code))
        check("U5 header anti-sniffing aktif", served.headers.get("X-Content-Type-Options") == "nosniff")

        up2 = await upload("foto-hp.jpg", png_bytes((252, 207, 43), (300, 300)), "image/jpeg")
        uploaded_keys.append(up2.json().get("storage_key"))
        check("U6 upload kedua (mobile/HP) berhasil & reuse Media Library", up2.status_code == 201
              and (await c.get("/media", headers=h)).json()["total"] == 2)

        check("V1 HTML berkedok JPG ditolak", (await upload("x.jpg", b"<html><script>alert(1)</script></html>", "image/jpeg")).status_code == 422)
        check("V2 SVG ditolak", (await upload("x.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "image/svg+xml")).status_code == 422)
        check("V3 executable ditolak", (await upload("x.png", b"MZ\x90\x00binary", "image/png")).status_code == 422)
        check("V4 berkas kosong ditolak", (await upload("x.png", b"", "image/png")).status_code == 422)
        big = png_bytes(size=(60, 60)) + b"0" * (11 * 1024 * 1024)
        check("V5 melebihi ukuran maksimum ditolak", (await upload("besar.png", big, "image/png")).status_code == 422)
        check("V6 upload tanpa auth ditolak", (await upload("x.png", png_bytes(), "image/png", headers={})).status_code in (401, 403))
        check("V7 path traversal pada serve ditolak", (await c.get("/media/files/../../etc/passwd")).status_code in (400, 404))
        check("V8 storage key dibuat server-side (bukan nama file user)",
              media["storage_key"] != "uji-desktop.png" and media["file_name"] == "uji-desktop.png")

        # resource memakai media hasil upload (upload → simpan → render)
        club_id = (await c.get("/club")).json()["items"][0]["id"]
        await c.patch(f"/club/{club_id}", json={"logo": media["url"], "hero_image": media["url"]}, headers=h)
        club = (await c.get("/club")).json()["items"][0]
        check("R1 Club logo & hero memakai media hasil upload", club["logo"] == media["url"] and club["hero_image"] == media["url"])

        teams = (await c.get("/teams")).json()["items"]
        team_id = teams[0]["id"] if teams else (await c.post("/teams", json={"club_id": club_id, "name": "ALSABBAT"}, headers=h)).json()["id"]
        player = await c.post("/players", json={"team_id": team_id, "full_name": "Pemain Sandbox", "position": "FORWARD",
                                               "photo": media["url"], "status": "ACTIVE"}, headers=h)
        staff = await c.post("/staff", json={"team_id": team_id, "name": "Staf Sandbox", "role": "HEAD_COACH",
                                             "photo": media["url"], "status": "ACTIVE"}, headers=h)
        sponsor = await c.post("/sponsors", json={"name": "Sponsor Sandbox", "logo": media["url"], "status": "ACTIVE"}, headers=h)
        news = await c.post("/content/posts", json={"title": "Berita Sandbox", "content": "isi", "thumbnail": media["url"],
                                                   "status": "DRAFT"}, headers=h)
        banner = await c.post("/banners", json={"headline_line_1": "SANDBOX", "image_url": media["url"], "status": "ACTIVE"}, headers=h)
        product = await c.post("/merchandise/catalog/products", json={"name": "Produk Sandbox", "price": 100000,
                                                                     "cover_media_id": media["id"], "status": "ACTIVE"}, headers=h)
        bg = await c.put("/site-content/bulk", json={"items": [{"key": "member.card.background_url", "value": media["url"]}]}, headers=h)
        check("R2 player/staff/sponsor/news/banner/product/member-card memakai media terupload",
              all(r.status_code in (200, 201) for r in (player, staff, sponsor, news, banner, product, bg)),
              str([r.status_code for r in (player, staff, sponsor, news, banner, product, bg)]))
        check("R3 banner publik meresolusi gambar hasil upload",
              (await c.get("/banners/public")).json()["items"][0]["image_resolved"] == media["url"])

        # backward compatibility: URL lama tetap dirender
        legacy = await c.post("/sponsors", json={"name": "Sponsor Lama", "logo": "https://cdn.lama.test/logo.png",
                                                "status": "ACTIVE"}, headers=h)
        check("B1 URL media lama (eksternal) tetap tersimpan & terbaca",
              legacy.status_code == 201 and legacy.json()["logo"] == "https://cdn.lama.test/logo.png")

        # Baraya: upload foto sendiri
        reg_a = await c.post("/baraya/register", json={"full_name": "Baraya A", "email": "a20@sandbox-alsabbat.dev",
                                                      "phone": "+628123456789", "password": "Sandbox123",
                                                      "password_confirmation": "Sandbox123"})
        reg_b = await c.post("/baraya/register", json={"full_name": "Baraya B", "email": "b20@sandbox-alsabbat.dev",
                                                      "phone": "+628123456780", "password": "Sandbox123",
                                                      "password_confirmation": "Sandbox123"})
        ha = {"Authorization": f"Bearer {(await c.post('/baraya/login', json={'email': 'a20@sandbox-alsabbat.dev', 'password': 'Sandbox123'})).json()['access_token']}"}
        hb = {"Authorization": f"Bearer {(await c.post('/baraya/login', json={'email': 'b20@sandbox-alsabbat.dev', 'password': 'Sandbox123'})).json()['access_token']}"}
        photo = await c.post("/baraya/me/photo", files={"file": ("selfie.png", png_bytes((0, 0, 0)), "image/png")}, headers=ha)
        check("F1 Baraya upload foto profil sendiri", photo.status_code == 200 and photo.json()["photo_url"], photo.text[:140])
        card_a = (await c.get("/baraya/member-card", headers=ha)).json()
        check("F2 foto langsung tampil di kartu member", card_a["photo_url"] == photo.json()["photo_url"])
        check("F3 foto Baraya B tidak terpengaruh (isolasi)", (await c.get("/baraya/member-card", headers=hb)).json()["photo_url"] in (None, ""))
        check("F4 upload foto tanpa login ditolak",
              (await c.post("/baraya/me/photo", files={"file": ("x.png", png_bytes(), "image/png")})).status_code in (401, 403))
        check("F5 berkas berbahaya ditolak untuk foto Baraya",
              (await c.post("/baraya/me/photo", files={"file": ("x.png", b"<html><script>x</script>", "image/png")}, headers=ha)).status_code == 422)
        num_before = card_a["member_number"]
        removed = await c.delete("/baraya/me/photo", headers=ha)
        card_after = (await c.get("/baraya/member-card", headers=ha)).json()
        check("F6 hapus foto berhasil & nomor member tetap",
              removed.status_code == 200 and card_after["photo_url"] in (None, "") and card_after["member_number"] == num_before)
        check("F7 Baraya tidak bisa mengubah latar kartu global",
              (await c.put("/site-content/bulk", json={"items": [{"key": "member.card.background_url", "value": "x"}]}, headers=ha)).status_code in (401, 403))
        check("F8 Baraya tidak bisa upload ke Media Library admin",
              (await c.post("/media/upload", files={"file": ("x.png", png_bytes(), "image/png")}, headers=ha)).status_code in (401, 403))

        # deletion safety
        media_id = media["id"]
        soft = await c.delete(f"/media/{media_id}", headers=h)
        check("D1 soft delete metadata tersedia", soft.status_code in (200, 204), str(soft.status_code))

        # regresi
        for path in ("/health", "/club", "/players", "/staff", "/matches", "/content/posts", "/gallery/public/albums",
                     "/merchandise/products", "/sponsors", "/banners/public", "/site-content/public", "/readiness/content"):
            rr = await c.get(path, headers=h if path == "/readiness/content" else None)
            check(f"R {path} still 200", rr.status_code == 200, str(rr.status_code))
        check("N1 tidak ada endpoint ticketing/klasemen",
              not [r.path for r in app.routes if any(w in r.path.lower() for w in ("ticket", "seat", "standing"))])
        check("N2 tidak ada binary/base64 gambar di koleksi media",
              await db[Collections.MEDIA].count_documents({"url": {"$regex": "^data:"}}) == 0)

    await get_client().drop_database(SANDBOX_DB)
    check("Z sandbox database dropped", SANDBOX_DB not in await get_client().list_database_names())
    print("\nCatatan: berkas uji hanya berada di object storage sandbox path, metadata sudah hilang bersama DB sandbox.")
    print("storage keys uji:", uploaded_keys)

    passed = sum(1 for _, ok in results if ok)
    print(f"\n{passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
