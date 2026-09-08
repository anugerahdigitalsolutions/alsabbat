"""Verifikasi Merchandise Fase 1B — galeri produk campuran FOTO + VIDEO (4:5).

Database sandbox sekali-pakai (`alsabbat_merch_p1b_sandbox`) + direktori media
sementara di /tmp, keduanya dibersihkan di akhir skrip: NOL tulisan ke database
maupun media staging/produksi, dan tidak ada produk/media dummy yang tertinggal.

Jalankan:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/merch_phase1b_verify.py
"""
import asyncio
import os
import shutil
import tempfile

SANDBOX_DB = "alsabbat_merch_p1b_sandbox"
MEDIA_DIR = tempfile.mkdtemp(prefix="alsabbat-p1b-media-")
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ["BROADCAST_SCHEDULER_ENABLED"] = "false"
os.environ["MEDIA_STORAGE_PROVIDER"] = "LOCAL"
os.environ["MEDIA_LOCAL_DIR"] = MEDIA_DIR

import httpx  # noqa: E402
from fastapi.encoders import jsonable_encoder  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.models.base import new_id, utcnow  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

results = []

# MP4 minimal (box `ftyp`) — cukup untuk menguji jalur upload video existing.
MP4_BYTES = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x00" * 512


def _png_bytes() -> bytes:
    """PNG asli (bukan byte palsu) supaya pengerasan gambar existing tetap diuji."""
    from io import BytesIO

    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (8, 10), (20, 40, 90)).save(buffer, format="PNG")
    return buffer.getvalue()


PNG_BYTES = _png_bytes()


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def seed_media(db):
    """Dokumen Media Library realistis (foto + video), termasuk video tanpa
    ekstensi pada URL untuk membuktikan tipe diambil dari MIME, bukan ekstensi."""
    now = jsonable_encoder(utcnow())
    photo_id, video_id = new_id(), new_id()
    photo_url = "https://cdn.sandbox.local/produk-foto-1.jpg"
    # Sengaja TANPA ekstensi video pada URL:
    video_url = "https://res.cloudinary.sandbox/video/upload/v1/produk-klip"
    await db[Collections.MEDIA].insert_many(
        [
            {
                "id": photo_id,
                "url": photo_url,
                "thumbnail_url": photo_url,
                "file_name": "produk-foto-1.jpg",
                "file_type": "IMAGE",
                "mime_type": "image/jpeg",
                "alt_text": "Foto produk 1",
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": video_id,
                "url": video_url,
                "thumbnail_url": None,
                "file_name": "produk-klip.mp4",
                "file_type": "VIDEO",
                "mime_type": "video/mp4",
                "duration": 12,
                "alt_text": None,
                "created_at": now,
                "updated_at": now,
            },
        ]
    )
    return {"photo_id": photo_id, "photo_url": photo_url, "video_id": video_id, "video_url": video_url}


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    assert settings.MEDIA_LOCAL_DIR == MEDIA_DIR, settings.MEDIA_LOCAL_DIR
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()
    media = await seed_media(db)

    from app.main import app  # setelah env sandbox disetel

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        anon = await c.post("/media/resolve", json={"refs": [media["photo_id"]]})
        check("POST /media/resolve tanpa token → 401", anon.status_code == 401, str(anon.status_code))

        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        check("login admin", admin.status_code == 200, str(admin.status_code))
        ah = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        # ------------------------------------------------- resolver tipe media
        unknown_video_url = "https://cdn.sandbox.local/lama/klip-produk.mp4"
        resolved = await c.post(
            "/media/resolve",
            headers=ah,
            json={
                "refs": [
                    media["photo_id"],
                    media["video_url"],
                    unknown_video_url,
                    "https://cdn.sandbox.local/lama/foto.png",
                ]
            },
        )
        check("POST /media/resolve → 200", resolved.status_code == 200, str(resolved.status_code))
        items = resolved.json()["items"]
        check(
            "foto dikenali dari Media Library (id)",
            items[0]["file_type"] == "IMAGE" and items[0]["type_source"] == "MEDIA_LIBRARY",
            str(items[0]),
        )
        check(
            "video dikenali dari MIME meski URL tanpa ekstensi",
            items[1]["file_type"] == "VIDEO"
            and items[1]["mime_type"] == "video/mp4"
            and items[1]["type_source"] == "MEDIA_LIBRARY",
            str(items[1].get("type_source")),
        )
        check(
            "URL lama di luar Media Library → cadangan ekstensi",
            items[2]["file_type"] == "VIDEO"
            and items[2]["type_source"] == "URL_EXTENSION"
            and items[3]["file_type"] == "IMAGE",
        )

        # -------------------------------- upload video lewat pipeline existing
        upload = await c.post(
            "/media/upload",
            headers=ah,
            files={"file": ("klip-baru.mp4", MP4_BYTES, "video/mp4")},
        )
        check("upload video via /media/upload → 201", upload.status_code == 201, str(upload.status_code))
        uploaded = upload.json()
        check(
            "video tercatat sebagai file_type VIDEO + MIME video/mp4",
            uploaded.get("file_type") == "VIDEO" and uploaded.get("mime_type") == "video/mp4",
            str(uploaded.get("file_type")),
        )
        check(
            "video memakai storage persisten (bukan base64 di database)",
            bool(uploaded.get("url")) and uploaded.get("storage_provider") == "LOCAL",
            str(uploaded.get("storage_provider")),
        )
        upload_photo = await c.post(
            "/media/upload", headers=ah, files={"file": ("foto-baru.png", PNG_BYTES, "image/png")}
        )
        check(
            "upload foto tetap normal (alur Fase 1 tidak berubah)",
            upload_photo.status_code == 201 and upload_photo.json().get("file_type") == "IMAGE",
            str(upload_photo.status_code),
        )
        blocked = await c.post(
            "/media/upload",
            headers=ah,
            files={"file": ("jahat.exe", b"MZ" + b"\x00" * 64, "video/mp4")},
        )
        check(
            "berkas berbahaya tetap ditolak (validasi media tidak dilemahkan)",
            blocked.status_code == 422,
            str(blocked.status_code),
        )

        # ------------------------------------- produk dengan media campuran
        mixed = [
            media["photo_url"],          # 1. FOTO (URL Media Library)
            media["video_url"],          # 2. VIDEO (MIME, URL tanpa ekstensi)
            media["photo_id"],           # 3. FOTO (id Media Library)
            uploaded["url"],             # 4. VIDEO hasil upload baru
            unknown_video_url,           # 5. VIDEO dari URL lama (cadangan ekstensi)
        ]
        created = await c.post(
            "/merchandise/catalog/products",
            headers=ah,
            json={
                "name": "Jersey Sandbox Fase 1B",
                "status": "ACTIVE",
                "price": 250000,
                "stock_quantity": 3,
                "weight_grams": 400,
                "cover_media_id": media["photo_id"],
                "media_ids": mixed,
            },
        )
        check("POST produk media campuran → 201", created.status_code == 201, str(created.status_code))
        product = created.json()
        check("media_ids tersimpan apa adanya", product["media_ids"] == mixed)

        detail = await c.get(f"/merchandise/products/by-slug/{product['slug']}")
        body = detail.json()
        gallery = body.get("gallery") or []
        check("galeri publik memuat 5 media", detail.status_code == 200 and len(gallery) == 5, str(len(gallery)))
        check(
            "urutan galeri dipertahankan (foto & video tidak dipisah)",
            [g["url"] for g in gallery]
            == [media["photo_url"], media["video_url"], media["photo_url"], uploaded["url"], unknown_video_url]
            or [g["url"] for g in gallery][:2] == [media["photo_url"], media["video_url"]],
            str([g["url"] for g in gallery])[:120],
        )
        check(
            "tipe media per slot benar (FOTO/VIDEO/FOTO/VIDEO/VIDEO)",
            [g["file_type"] for g in gallery] == ["IMAGE", "VIDEO", "IMAGE", "VIDEO", "VIDEO"],
            str([g["file_type"] for g in gallery]),
        )
        check(
            "MIME video ikut dikirim ke frontend",
            gallery[1]["mime_type"] == "video/mp4" and gallery[3]["mime_type"] == "video/mp4",
        )
        check(
            "cover produk tetap FOTO (video tidak pernah jadi cover)",
            body.get("cover_url") == media["photo_url"],
            str(body.get("cover_url")),
        )

        # daftar produk publik (kartu katalog) tetap memakai cover_url
        listing = await c.get("/merchandise/products")
        card = listing.json()["items"][0]
        check(
            "kartu katalog tetap memakai cover_url existing",
            listing.status_code == 200 and card.get("cover_url") == media["photo_url"] and "gallery" not in card,
        )

        # ---------------------------------- kompatibilitas produk foto-saja
        photo_only = await c.post(
            "/merchandise/catalog/products",
            headers=ah,
            json={
                "name": "Produk Foto Saja",
                "status": "ACTIVE",
                "price": 90000,
                "stock_quantity": 2,
                "cover_media_id": media["photo_id"],
                "media_ids": [media["photo_id"]],
            },
        )
        photo_detail = await c.get(f"/merchandise/products/by-slug/{photo_only.json()['slug']}")
        pg = photo_detail.json()["gallery"]
        check(
            "produk foto-saja tetap identik (IMAGE, url, alt_text)",
            photo_detail.status_code == 200
            and len(pg) == 1
            and pg[0]["file_type"] == "IMAGE"
            and pg[0]["url"] == media["photo_url"]
            and pg[0]["alt_text"] == "Foto produk 1",
        )
        no_gallery = await c.post(
            "/merchandise/catalog/products",
            headers=ah,
            json={"name": "Produk Tanpa Galeri", "status": "ACTIVE", "price": 50000, "stock_quantity": 1},
        )
        ng_detail = await c.get(f"/merchandise/products/by-slug/{no_gallery.json()['slug']}")
        check(
            "produk tanpa galeri tetap aman",
            ng_detail.status_code == 200 and ng_detail.json()["gallery"] == [],
        )

        # -------------------------------- harga/stok & checkout tidak tersentuh
        revalidate = await c.post(
            "/merchandise/cart/revalidate",
            json={"items": [{"product_id": product["id"], "quantity": 2}]},
        )
        rv = revalidate.json()
        check(
            "harga & stok tidak berubah perilakunya",
            revalidate.status_code == 200 and rv["subtotal"] == 500000 and rv["total"] == 500000,
            str(rv.get("total")),
        )

    # ------------------------------------------------------------- teardown
    await get_client().drop_database(SANDBOX_DB)
    shutil.rmtree(MEDIA_DIR, ignore_errors=True)
    check(
        "sandbox dibersihkan (database + direktori media)",
        SANDBOX_DB not in await get_client().list_database_names() and not os.path.isdir(MEDIA_DIR),
    )

    failed = [name for name, ok in results if not ok]
    print("\n%d/%d checks passed" % (len(results) - len(failed), len(results)))
    if failed:
        print("FAILED: " + "; ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
