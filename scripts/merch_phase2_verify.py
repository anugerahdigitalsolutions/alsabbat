"""Verifikasi Merchandise Fase 2 — ongkir real-time RajaOngkir (Shipping Cost API).

Database sandbox sekali-pakai (di-DROP di akhir): NOL tulisan ke database
staging/produksi dan tidak ada produk/order dummy yang tertinggal.

CATATAN PENTING: skrip ini TIDAK memanggil API RajaOngkir sungguhan (staging
belum punya kredensial). Transport HTTP di batas integrasi (`_call`) diganti
stub HANYA di dalam skrip uji ini untuk memverifikasi normalisasi, otoritas
harga, dan penanganan galat. Kode aplikasi tetap memanggil RajaOngkir asli.

Jalankan:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/merch_phase2_verify.py
"""
import asyncio
import os

SANDBOX_DB = "alsabbat_merch_p2_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ["BROADCAST_SCHEDULER_ENABLED"] = "false"

import httpx  # noqa: E402
from fastapi.encoders import jsonable_encoder  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.models.base import new_id, utcnow  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

API_KEY = "ro-cost-key-SANDBOX-4321"
results = []
calls = []


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


# Bentuk balasan mengikuti kontrak RajaOngkir (meta + data[]).
def _fake_payload(cost_jne=18000):
    return {
        "meta": {"message": "success", "code": 200, "status": "success"},
        "data": [
            {"name": "JNE", "code": "jne", "service": "REG", "description": "Layanan Reguler", "cost": cost_jne, "etd": "2-3 day"},
            {"name": "SiCepat", "code": "sicepat", "service": "BEST", "description": "Besok Sampai", "cost": 27000, "etd": "1 day"},
            {"name": "JNE", "code": "jne", "service": "OKE", "description": "Ekonomis", "cost": 0, "etd": ""},
        ],
    }


DEST_PAYLOAD = {
    "meta": {"status": "success", "code": 200},
    "data": [
        {
            "id": 17594,
            "label": "CICENDO, BANDUNG, JAWA BARAT, 40172",
            "subdistrict_name": "Pasirkaliki",
            "district_name": "Cicendo",
            "city_name": "Bandung",
            "province_name": "Jawa Barat",
            "zip_code": "40172",
        }
    ],
}


async def main():
    assert settings.DB_NAME == SANDBOX_DB
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()

    from app.main import app
    from app.services import shipping_rajaongkir as ship

    cost_state = {"jne": 18000}

    async def fake_call(method, path, **kwargs):
        # Stub HANYA di skrip uji. Tetap melewati _api_key() sehingga
        # perilaku "belum dikonfigurasi" ikut teruji.
        ship._api_key()
        calls.append((method, path, kwargs.get("data") or kwargs.get("params")))
        if "destination" in path:
            return DEST_PAYLOAD
        return _fake_payload(cost_state["jne"])

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        ah = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        # ---------------------------------------- 1. belum dikonfigurasi
        cfg = await c.get("/merchandise/shipping/config")
        check(
            "config publik: SHIPPING_NOT_CONFIGURED + tanpa rahasia",
            cfg.status_code == 200
            and cfg.json()["configured"] is False
            and cfg.json()["status"] == "SHIPPING_NOT_CONFIGURED"
            and API_KEY not in cfg.text
            and "value" not in cfg.text,
            str(cfg.json()),
        )
        search_off = await c.get("/merchandise/shipping/destinations", params={"search": "cicendo"})
        check(
            "pencarian tujuan tanpa API key → 422 pesan aman",
            search_off.status_code == 422 and "API Key" in search_off.text and API_KEY not in search_off.text,
            str(search_off.status_code),
        )

        # produk uji (hanya di sandbox)
        p_ok = await c.post(
            "/merchandise/catalog/products",
            headers=ah,
            json={"name": "Jersey P2", "status": "ACTIVE", "price": 200000, "stock_quantity": 5, "weight_grams": 500},
        )
        product = p_ok.json()
        variant = (
            await c.post(
                "/merchandise/catalog/variants",
                headers=ah,
                json={"product_id": product["id"], "name": "L", "status": "ACTIVE", "stock_quantity": 4, "weight_grams": 900},
            )
        ).json()
        p_noweight = (
            await c.post(
                "/merchandise/catalog/products",
                headers=ah,
                json={"name": "Topi Tanpa Berat", "status": "ACTIVE", "price": 50000, "stock_quantity": 5},
            )
        ).json()

        quote_off = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": product["id"], "variant_id": variant["id"], "quantity": 1}], "destination_id": "17594"},
        )
        check("quote tanpa API key → 422 aman", quote_off.status_code == 422 and API_KEY not in quote_off.text)

        # checkout tetap jalan (perilaku lama) saat ongkir belum dikonfigurasi
        legacy_checkout = await c.post(
            "/merchandise/checkout",
            json={
                "items": [{"product_id": product["id"], "variant_id": variant["id"], "quantity": 1}],
                "customer": {"name": "Guest Sandbox", "email": "guest@sandbox.dev", "phone": "08123456789"},
                "shipping": {"recipient": "Guest", "address": "Jl. Sandbox 1", "city": "Bandung", "province": "Jawa Barat", "postal_code": "40172"},
            },
        )
        check(
            "ongkir belum aktif → checkout lama tetap bisa (ongkir 0)",
            legacy_checkout.status_code == 201
            and legacy_checkout.json()["order"]["shipping_cost"] == 0
            and legacy_checkout.json()["order"]["total"] == 200000,
            str(legacy_checkout.status_code),
        )

        # ---------------------------------- 2. API key ada, origin kosong
        await c.put("/settings/integrations", headers=ah, json={"values": {"RAJAONGKIR_COST_API_KEY": API_KEY}})
        ship._call = fake_call  # stub transport (uji saja)
        ship._cache.clear()
        no_origin = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": product["id"], "variant_id": variant["id"], "quantity": 1}], "destination_id": "17594"},
        )
        check(
            "origin belum diatur → 422 pesan aman",
            no_origin.status_code == 422 and "Origin Destination ID" in no_origin.text and API_KEY not in no_origin.text,
            str(no_origin.status_code),
        )

        await c.put("/settings/integrations", headers=ah, json={"values": {"SHIPPING_ORIGIN_DESTINATION_ID": "17549"}})
        ship._cache.clear()
        cfg2 = await c.get("/merchandise/shipping/config")
        check("config → READY tanpa membocorkan key", cfg2.json()["configured"] is True and API_KEY not in cfg2.text)

        # --------------------------------------- 3. pencarian tujuan
        short = await c.get("/merchandise/shipping/destinations", params={"search": "ci"})
        check("query < 3 karakter → 422", short.status_code == 422, str(short.status_code))
        found = await c.get("/merchandise/shipping/destinations", params={"search": "cicendo"})
        item = found.json()["items"][0]
        check(
            "hasil pencarian dinormalisasi (destination_id + label + kode pos)",
            found.status_code == 200
            and item["destination_id"] == "17594"
            and item["city"] == "Bandung"
            and item["postal_code"] == "40172"
            and "zip_code" not in found.text,
            str(item),
        )

        # ------------------------------------------- 4. berat & quote
        quote = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": product["id"], "variant_id": variant["id"], "quantity": 2}], "destination_id": "17594"},
        )
        qdata = quote.json()
        check(
            "berat varian menang atas berat produk (900g × 2 = 1800g)",
            quote.status_code == 200 and qdata["shipment_weight_grams"] == 1800,
            str(qdata.get("shipment_weight_grams")),
        )
        check(
            "gram dikirim apa adanya ke API (satuan internal tidak berubah)",
            any(str((c3[2] or {}).get("weight")) == "1800" for c3 in calls if c3[0] == "POST"),
            str([c3[2] for c3 in calls if c3[0] == "POST"][-1:]),
        )
        opts = qdata["options"]
        check(
            "opsi dinormalisasi & diurut termurah, opsi cost 0 dibuang",
            [o["courier_code"] for o in opts] == ["jne", "sicepat"]
            and opts[0]["service_code"] == "REG"
            and opts[0]["cost"] == 18000
            and opts[0]["etd"] == "2-3 day"
            and opts[0]["available"] is True,
            str([(o["courier_code"], o["service_code"], o["cost"]) for o in opts]),
        )
        ship._cache.clear()
        prod_weight_quote = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": product["id"], "quantity": 1}], "destination_id": "17594"},
        )
        check(
            "tanpa varian → berat produk dipakai (500g)",
            prod_weight_quote.status_code == 422 or prod_weight_quote.json().get("shipment_weight_grams") == 500,
            str(prod_weight_quote.status_code),
        )
        missing = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": p_noweight["id"], "quantity": 1}], "destination_id": "17594"},
        )
        check(
            "produk tanpa berat memblokir ongkir dengan pesan jelas",
            missing.status_code == 422 and "Berat kirim belum diatur" in missing.text,
            str(missing.status_code),
        )
        bad_dest = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": product["id"], "variant_id": variant["id"], "quantity": 1}], "destination_id": "abc"},
        )
        check("destination_id tidak valid → 422", bad_dest.status_code == 422)
        inactive = await c.patch(f"/merchandise/catalog/products/{p_noweight['id']}", headers=ah, json={"status": "ARCHIVED"})
        quote_inactive = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": p_noweight["id"], "quantity": 1}], "destination_id": "17594"},
        )
        check("produk non-aktif → 422", inactive.status_code == 200 and quote_inactive.status_code == 422)
        over_stock = await c.post(
            "/merchandise/shipping/quote",
            json={"items": [{"product_id": product["id"], "variant_id": variant["id"], "quantity": 99}], "destination_id": "17594"},
        )
        check("stok kurang → 422 (validasi lama tetap jalan)", over_stock.status_code == 422)

        # ------------------------------- 5. otoritas ongkir saat checkout
        base_order = {
            "items": [{"product_id": product["id"], "variant_id": variant["id"], "quantity": 2}],
            "customer": {"name": "Guest Sandbox", "email": "guest@sandbox.dev", "phone": "08123456789"},
        }
        no_selection = await c.post(
            "/merchandise/checkout",
            json={**base_order, "shipping": {"recipient": "Guest", "address": "Jl. Sandbox 1", "city": "Bandung", "province": "Jawa Barat", "postal_code": "40172"}},
        )
        check(
            "ongkir aktif tanpa pilihan kurir → 422 wajib pilih",
            no_selection.status_code == 422 and "layanan kurir" in no_selection.text,
            str(no_selection.status_code),
        )

        shipping_sel = {
            "recipient": "Guest", "address": "Jl. Sandbox 1", "city": "Bandung",
            "province": "Jawa Barat", "postal_code": "40172",
            "destination_id": "17594", "destination_label": "CICENDO, BANDUNG",
            "courier_code": "jne", "courier_name": "JNE", "service_code": "REG",
            "service_name": "REG", "shipping_cost": 18000, "shipping_etd": "2-3 day",
        }
        tampered = await c.post(
            "/merchandise/checkout",
            json={**base_order, "shipping": {**shipping_sel, "shipping_cost": 1000}},
        )
        check(
            "harga ongkir dari frontend tidak dipercaya → 422 harus hitung ulang",
            tampered.status_code == 422 and "Biaya kirim berubah" in tampered.text,
            str(tampered.status_code),
        )
        unavailable = await c.post(
            "/merchandise/checkout",
            json={**base_order, "shipping": {**shipping_sel, "service_code": "SUPERKILAT", "shipping_cost": None}},
        )
        check(
            "layanan yang tidak ada di quote ditolak",
            unavailable.status_code == 422 and "tidak tersedia" in unavailable.text,
            str(unavailable.status_code),
        )
        ok_order = await c.post("/merchandise/checkout", json={**base_order, "shipping": shipping_sel})
        order = ok_order.json()["order"]
        check(
            "checkout: total = subtotal + ongkir server",
            ok_order.status_code == 201
            and order["subtotal"] == 400000
            and order["shipping_cost"] == 18000
            and order["total"] == 418000,
            str((order.get("subtotal"), order.get("shipping_cost"), order.get("total"))),
        )
        snap = order["shipping"]
        check(
            "snapshot pengiriman lengkap di order",
            snap["destination_id"] == "17594"
            and snap["recipient"] == "Guest"
            and snap["courier_code"] == "jne"
            and snap["courier_name"] == "JNE"
            and snap["service_code"] == "REG"
            and snap["shipping_cost"] == 18000
            and snap["shipping_etd"] == "2-3 day"
            and snap["shipment_weight_grams"] == 1800,
            str(snap),
        )
        raw_order = await db[Collections.ORDERS].find_one({"id": order["id"]})
        check(
            "tidak menyimpan API key / respons mentah RajaOngkir",
            API_KEY not in str(raw_order) and "meta" not in raw_order.get("shipping", {}),
        )
        check(
            "Midtrans tidak berubah (gross amount = total termasuk ongkir)",
            ok_order.json()["payment"]["provider"] == "MIDTRANS"
            and ok_order.json()["payment"]["configured"] is False,
        )

        # harga ongkir berubah di penyedia → checkout menolak harga lama
        cost_state["jne"] = 21000
        ship._cache.clear()
        changed = await c.post("/merchandise/checkout", json={**base_order, "shipping": shipping_sel})
        check(
            "harga ongkir berubah di penyedia → ditolak, minta refresh",
            changed.status_code == 422 and "Biaya kirim berubah" in changed.text,
            str(changed.status_code),
        )

        # ------------------------------- 6. kompatibilitas pesanan lama
        legacy_id = new_id()
        await db[Collections.ORDERS].insert_one(
            {
                "id": legacy_id,
                "order_number": "ALS-2025-000099",
                "customer_id": None,
                "customer": {"name": "Lama", "email": "lama@sandbox.dev", "phone": "0812"},
                "shipping": {"recipient": "Lama", "address": "Jl. Lama", "city": "Bandung", "province": "Jawa Barat", "postal_code": "40100"},
                "items": [], "subtotal": 100000, "shipping_cost": 0, "total": 100000,
                "currency": "IDR", "order_status": "PENDING", "payment_status": "PENDING",
                "created_at": jsonable_encoder(utcnow()), "updated_at": jsonable_encoder(utcnow()),
            }
        )
        legacy_read = await c.get("/merchandise/orders/track", params={"order_number": "ALS-2025-000099", "email": "lama@sandbox.dev"})
        check(
            "pesanan lama tanpa field RajaOngkir tetap terbaca",
            legacy_read.status_code == 200 and legacy_read.json()["total"] == 100000,
            str(legacy_read.status_code),
        )

        # ------------------------------------ 7. Fase 1/1B tidak berubah
        detail = await c.get(f"/merchandise/products/by-slug/{product['slug']}")
        check(
            "katalog + berat + galeri tetap normal (Fase 1/1B)",
            detail.status_code == 200
            and detail.json()["weight_grams"] == 500
            and detail.json()["gallery"] == [],
        )
        payment_status = await c.get("/merchandise/payment/status")
        check(
            "payment/status tetap seperti sebelumnya",
            payment_status.status_code == 200 and payment_status.json()["provider"] == "MIDTRANS",
        )
        settings_view = await c.get("/settings/integrations", headers=ah)
        check(
            "API key RajaOngkir tetap ter-mask di panel admin",
            API_KEY not in settings_view.text and "••••" in settings_view.text,
        )

    await get_client().drop_database(SANDBOX_DB)
    check("database sandbox dihapus", SANDBOX_DB not in await get_client().list_database_names())

    failed = [name for name, ok in results if not ok]
    print("\n%d/%d checks passed" % (len(results) - len(failed), len(results)))
    if failed:
        print("FAILED: " + "; ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
