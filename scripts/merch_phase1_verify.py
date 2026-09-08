"""Verifikasi Merchandise Fase 1 — integration settings aman + data pengiriman produk.

Database sandbox sekali-pakai (`alsabbat_merch_phase1_sandbox`) yang di-DROP di
akhir skrip: NOL tulisan ke database preview/staging/produksi dan tidak ada
produk/order dummy di database bisnis.

Jalankan:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/merch_phase1_verify.py
"""
import asyncio
import hashlib
import os

SANDBOX_DB = "alsabbat_merch_phase1_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ["BROADCAST_SCHEDULER_ENABLED"] = "false"
# Uji fallback environment variable (perilaku lama harus tetap jalan).
ENV_SERVER_KEY = "SB-Mid-server-FROMENV1111"
os.environ["MIDTRANS_SERVER_KEY"] = ENV_SERVER_KEY

import httpx  # noqa: E402
from fastapi.encoders import jsonable_encoder  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.base import new_id, utcnow  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

ADMIN_SECRET = "SB-Mid-server-FROMADMIN9876"
results = []


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()

    # Media Library sandbox (untuk uji galeri berbasis id)
    media_id = new_id()
    media_url = "https://cdn.sandbox.local/produk-utama.jpg"
    await db[Collections.MEDIA].insert_one(
        {
            "id": media_id,
            "url": media_url,
            "file_name": "produk-utama.jpg",
            "alt_text": "Produk utama",
            "mime_type": "image/jpeg",
            "created_at": jsonable_encoder(utcnow()),
            "updated_at": jsonable_encoder(utcnow()),
        }
    )
    # Admin dengan role tanpa permission store:manage
    await db[Collections.USERS].insert_one(
        {
            "id": new_id(),
            "email": "klubadmin@sandbox-alsabbat.dev",
            "name": "Klub Admin Sandbox",
            "role": "CLUB_ADMIN",
            "is_active": True,
            "avatar_url": None,
            "password_hash": hash_password("Sandbox123"),
            "created_at": jsonable_encoder(utcnow()),
            "updated_at": jsonable_encoder(utcnow()),
            "last_login_at": None,
        }
    )

    from app.main import app  # setelah env sandbox disetel
    from app.services import integration_settings as isvc
    from app.services.payments import MidtransProvider, provider_status

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        # ------------------------------------------------------------- RBAC
        anon = await c.get("/settings/integrations")
        check("GET /settings/integrations tanpa token → 401", anon.status_code == 401, str(anon.status_code))

        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        check("login super admin", admin.status_code == 200, str(admin.status_code))
        ah = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        limited = await c.post(
            "/auth/login", json={"email": "klubadmin@sandbox-alsabbat.dev", "password": "Sandbox123"}
        )
        if limited.status_code == 200:
            lh = {"Authorization": f"Bearer {limited.json()['access_token']}"}
            denied = await c.get("/settings/integrations", headers=lh)
            check(
                "admin tanpa store:manage → 403",
                denied.status_code == 403,
                str(denied.status_code),
            )
            denied_put = await c.put(
                "/settings/integrations", headers=lh, json={"values": {"SHIPPING_ORIGIN_NAME": "X"}}
            )
            check("PUT tanpa store:manage → 403", denied_put.status_code == 403, str(denied_put.status_code))
        else:
            check("login admin terbatas", False, str(limited.status_code))

        # -------------------------------------------- fallback environment
        listing = await c.get("/settings/integrations", headers=ah)
        check("GET settings → 200", listing.status_code == 200, str(listing.status_code))
        body = listing.text
        items = {item["key"]: item for item in listing.json()["items"]}
        check("10 setting terdefinisi", len(items) == 10, str(len(items)))
        srv = items["MIDTRANS_SERVER_KEY"]
        check(
            "MIDTRANS_SERVER_KEY terbaca dari ENV (fallback)",
            srv["configured"] is True and srv["source"] == "ENV",
            str(srv.get("source")),
        )
        check(
            "nilai rahasia hanya ter-mask + plaintext ENV tidak dikirim",
            srv["value"] is None
            and srv["masked_value"].endswith("1111")
            and srv["masked_value"].startswith("•")
            and ENV_SERVER_KEY not in body,
        )
        check(
            "RajaOngkir & origin belum dikonfigurasi (tidak wajib)",
            items["RAJAONGKIR_COST_API_KEY"]["configured"] is False
            and items["SHIPPING_ORIGIN_DESTINATION_ID"]["configured"] is False,
        )
        check(
            "Midtrans mode default sandbox (tidak berubah sendiri)",
            provider_status()["environment"] == "sandbox",
        )

        # ----------------------------------------------- simpan via admin
        saved = await c.put(
            "/settings/integrations",
            headers=ah,
            json={
                "values": {
                    "MIDTRANS_SERVER_KEY": ADMIN_SECRET,
                    "RAJAONGKIR_COST_API_KEY": "ro-cost-key-ABCD",
                    "SHIPPING_ORIGIN_DESTINATION_ID": "1391",
                    "SHIPPING_ORIGIN_PINPOINT_LAT": "-6.914744",
                    "SHIPPING_ORIGIN_PINPOINT_LONG": "107.609810",
                    "SHIPPING_ORIGIN_NAME": "Sekretariat AL SABBAT",
                    "SHIPPING_ORIGIN_PHONE": "+62 812-3456-789",
                }
            },
        )
        check("PUT settings → 200", saved.status_code == 200, str(saved.status_code))
        saved_body = saved.text
        saved_items = {item["key"]: item for item in saved.json()["items"]}
        check(
            "respons simpan tidak pernah memuat plaintext rahasia",
            ADMIN_SECRET not in saved_body and "ro-cost-key-ABCD" not in saved_body,
        )
        check(
            "rahasia admin ter-mask (4 karakter terakhir)",
            saved_items["MIDTRANS_SERVER_KEY"]["masked_value"].endswith("9876")
            and saved_items["MIDTRANS_SERVER_KEY"]["source"] == "ADMIN"
            and saved_items["MIDTRANS_SERVER_KEY"]["value"] is None,
        )
        check(
            "telepon dinormalisasi ke format Komerce",
            saved_items["SHIPPING_ORIGIN_PHONE"]["value"] == "628123456789",
            str(saved_items["SHIPPING_ORIGIN_PHONE"]["value"]),
        )
        check(
            "koordinat & origin id tersimpan apa adanya",
            saved_items["SHIPPING_ORIGIN_PINPOINT_LAT"]["value"] == "-6.914744"
            and saved_items["SHIPPING_ORIGIN_DESTINATION_ID"]["value"] == "1391",
        )
        stored_doc = await db[Collections.INTEGRATION_SETTINGS].find_one({"key": "MIDTRANS_SERVER_KEY"})
        check(
            "tersimpan di koleksi khusus integration_settings",
            bool(stored_doc) and stored_doc.get("secret") is True,
        )

        # ------------------------------- prioritas resolver & kompatibilitas
        check(
            "resolver: Admin setting menang atas ENV",
            isvc.resolve("MIDTRANS_SERVER_KEY") == ADMIN_SECRET,
        )
        payload = {"order_id": "ALS-2026-000001", "status_code": "200", "gross_amount": "150000.00"}
        raw = f"{payload['order_id']}{payload['status_code']}{payload['gross_amount']}{ADMIN_SECRET}"
        payload["signature_key"] = hashlib.sha512(raw.encode()).hexdigest()
        check(
            "verifikasi signature Midtrans (SHA-512) memakai key dari Admin",
            MidtransProvider().verify_notification(payload) is True,
        )
        payload_bad = dict(payload, signature_key="0" * 128)
        check(
            "signature palsu tetap ditolak",
            MidtransProvider().verify_notification(payload_bad) is False,
        )
        status = provider_status()
        check(
            "provider_status: client key masih kurang (perilaku lama)",
            status["configured"] is False and status["missing_env"] == ["MIDTRANS_CLIENT_KEY"],
            str(status["missing_env"]),
        )

        # ------------------------------------------------ hapus → fallback
        cleared = await c.put("/settings/integrations", headers=ah, json={"values": {"MIDTRANS_SERVER_KEY": ""}})
        cleared_items = {item["key"]: item for item in cleared.json()["items"]}
        check(
            "hapus setting → kembali ke ENV",
            cleared_items["MIDTRANS_SERVER_KEY"]["source"] == "ENV"
            and isvc.resolve("MIDTRANS_SERVER_KEY") == ENV_SERVER_KEY,
        )

        # ----------------------------------------------------- validasi
        cases = {
            "telepon tidak valid": {"SHIPPING_ORIGIN_PHONE": "12"},
            "latitude di luar rentang": {"SHIPPING_ORIGIN_PINPOINT_LAT": "999"},
            "longitude di luar rentang": {"SHIPPING_ORIGIN_PINPOINT_LONG": "-500"},
            "origin id bukan angka": {"SHIPPING_ORIGIN_DESTINATION_ID": "abc"},
            "boolean tidak valid": {"MIDTRANS_IS_PRODUCTION": "mungkin"},
            "key tidak dikenal": {"SECRET_APAPUN": "x"},
        }
        for name, values in cases.items():
            res = await c.put("/settings/integrations", headers=ah, json={"values": values})
            check(f"validasi: {name} → 422", res.status_code == 422, str(res.status_code))

        # ----------------------------------------- tidak bocor ke publik
        public_content = await c.get("/site-content/public")
        payment_public = await c.get("/merchandise/payment/status")
        check(
            "endpoint publik tidak membocorkan rahasia",
            ADMIN_SECRET not in public_content.text
            and ENV_SERVER_KEY not in public_content.text
            and ENV_SERVER_KEY not in payment_public.text
            and "ro-cost-key-ABCD" not in public_content.text,
        )
        check(
            "GET /merchandise/payment/status tetap seperti sebelumnya",
            payment_public.status_code == 200
            and payment_public.json()["provider"] == "MIDTRANS"
            and "missing_env" in payment_public.json(),
        )

        # ---------------------------------------------- produk: pengiriman
        created = await c.post(
            "/merchandise/catalog/products",
            headers=ah,
            json={
                "name": "Jersey Sandbox Fase 1",
                "status": "ACTIVE",
                "price": 150000,
                "stock_quantity": 5,
                "sku": "SBX-J1",
                "weight_grams": 350,
                "length_cm": 30,
                "width_cm": 20.5,
                "height_cm": 5,
                "cover_media_id": media_id,
                "media_ids": [media_id, "https://cdn.sandbox.local/produk-2.jpg"],
            },
        )
        check("POST produk (dengan data kirim) → 201", created.status_code == 201, str(created.status_code))
        product = created.json()
        check(
            "field pengiriman tersimpan",
            product["weight_grams"] == 350
            and product["length_cm"] == 30
            and product["width_cm"] == 20.5
            and product["height_cm"] == 5,
        )

        detail = await c.get(f"/merchandise/products/by-slug/{product['slug']}")
        detail_body = detail.json()
        check(
            "detail publik memuat data pengiriman",
            detail.status_code == 200 and detail_body["weight_grams"] == 350,
        )
        gallery = detail_body.get("gallery") or []
        check(
            "galeri produk: id Media Library + URL keduanya tampil",
            len(gallery) == 2
            and gallery[0]["url"] == media_url
            and gallery[1]["url"] == "https://cdn.sandbox.local/produk-2.jpg",
            str(len(gallery)),
        )

        patched = await c.patch(
            f"/merchandise/catalog/products/{product['id']}", headers=ah, json={"weight_grams": 400}
        )
        check(
            "PATCH berat produk → tersimpan",
            patched.status_code == 200 and patched.json()["weight_grams"] == 400,
        )

        legacy = await c.post(
            "/merchandise/catalog/products",
            headers=ah,
            json={"name": "Produk Lama Tanpa Berat", "status": "ACTIVE", "price": 50000, "stock_quantity": 2},
        )
        legacy_detail = await c.get(f"/merchandise/products/by-slug/{legacy.json()['slug']}")
        check(
            "produk tanpa berat tetap valid (tanpa nilai palsu)",
            legacy.status_code == 201
            and legacy_detail.status_code == 200
            and legacy_detail.json()["weight_grams"] is None
            and legacy_detail.json()["length_cm"] is None,
        )

        bad_weight = await c.post(
            "/merchandise/catalog/products",
            headers=ah,
            json={"name": "Berat Negatif", "price": 1000, "weight_grams": -5},
        )
        check("berat negatif → 422", bad_weight.status_code == 422, str(bad_weight.status_code))

        # ------------------------------- harga & stok TIDAK berubah perilaku
        revalidate = await c.post(
            "/merchandise/cart/revalidate",
            json={"items": [{"product_id": product["id"], "quantity": 2}]},
        )
        rv = revalidate.json()
        check(
            "cart/revalidate: harga dihitung server seperti sebelumnya",
            revalidate.status_code == 200
            and rv["subtotal"] == 300000
            and rv["shipping_cost"] == 0
            and rv["total"] == 300000,
            str(rv.get("total")),
        )
        over = await c.post(
            "/merchandise/cart/revalidate",
            json={"items": [{"product_id": product["id"], "quantity": 99}]},
        )
        check("validasi stok tetap menolak qty > stok", over.status_code == 422, str(over.status_code))

        listing_public = await c.get("/merchandise/products")
        check(
            "daftar produk publik tetap normal",
            listing_public.status_code == 200 and listing_public.json()["total"] == 2,
            str(listing_public.json().get("total")),
        )

    # ------------------------------------------------------------ teardown
    await get_client().drop_database(SANDBOX_DB)
    check("database sandbox dihapus", SANDBOX_DB not in await get_client().list_database_names())

    failed = [name for name, ok in results if not ok]
    print("\n%d/%d checks passed" % (len(results) - len(failed), len(results)))
    if failed:
        print("FAILED: " + "; ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
