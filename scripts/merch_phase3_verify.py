"""Verifikasi Merchandise Fase 3 — Admin Order Management (lifecycle, timeline, AWB).

Database sandbox sekali-pakai (di-DROP di akhir): NOL tulisan ke database
staging/produksi dan tidak ada order/produk dummy yang tertinggal.

Tidak memanggil API eksternal apa pun (RajaOngkir/Midtrans tidak dihubungi;
gating pembayaran diuji lewat konfigurasi kunci saja).

Jalankan:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/merch_phase3_verify.py
"""
import asyncio
import os

SANDBOX_DB = "alsabbat_merch_p3_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ["BROADCAST_SCHEDULER_ENABLED"] = "false"

import httpx  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.models.base import new_id, utcnow  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402
from app.services import order_fulfilment as fulfil  # noqa: E402

results = []


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


CUSTOMER = {"name": "Uji Fase Tiga", "email": "uji.p3@sandbox-alsabbat.dev", "phone": "08123456789"}
SHIPPING = {
    "recipient": "Uji Fase Tiga",
    "address": "Jl. Sandbox 3",
    "city": "Bandung",
    "province": "Jawa Barat",
    "postal_code": "40172",
}


async def main():
    assert settings.DB_NAME == SANDBOX_DB
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()

    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        ah = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        product = (
            await c.post(
                "/merchandise/catalog/products",
                headers=ah,
                json={"name": "Jersey P3", "status": "ACTIVE", "price": 150000, "stock_quantity": 10, "weight_grams": 600},
            )
        ).json()

        async def make_order(email=None):
            payload = {
                "items": [{"product_id": product["id"], "quantity": 1}],
                "customer": {**CUSTOMER, **({"email": email} if email else {})},
                "shipping": SHIPPING,
            }
            return await c.post("/merchandise/checkout", json=payload)

        # ------------------------------------------------ 1. order creation
        created = await make_order()
        order = created.json()["order"]
        check(
            "checkout Fase 2 tetap jalan + order_status PENDING",
            created.status_code == 201 and order["order_status"] == "PENDING" and order["total"] == 150000,
            str(created.status_code),
        )
        raw = await db[Collections.ORDERS].find_one({"id": order["id"]})
        check(
            "timeline ORDER_CREATED tersimpan saat checkout",
            len(raw.get("timeline") or []) == 1
            and raw["timeline"][0]["event"] == "ORDER_CREATED"
            and raw["timeline"][0]["actor_type"] == "CUSTOMER"
            and raw["timeline"][0]["at"],
            str(raw.get("timeline")),
        )

        second = (await make_order("kedua.p3@sandbox-alsabbat.dev")).json()["order"]

        # ------------------------------------------------ 2. admin list
        unauth = await c.patch(f"/merchandise/orders/{order['id']}/status", json={"order_status": "PROCESSING"})
        check("PATCH status tanpa token → 401/403", unauth.status_code in (401, 403), str(unauth.status_code))

        listed = await c.get("/merchandise/orders", headers=ah)
        data = listed.json()
        check(
            "admin list: 2 order, terbaru di atas, ada item_count/subtotal/ongkir",
            listed.status_code == 200
            and data["total"] == 2
            and data["items"][0]["order_number"] == second["order_number"]
            and data["items"][0]["item_count"] == 1
            and data["items"][0]["subtotal"] == 150000
            and data["items"][0]["shipping_cost"] == 0,
            str([i["order_number"] for i in data["items"]]),
        )
        by_email = await c.get("/merchandise/orders", headers=ah, params={"q": "kedua.p3"})
        check(
            "pencarian by email pelanggan",
            by_email.status_code == 200
            and by_email.json()["total"] == 1
            and by_email.json()["items"][0]["order_number"] == second["order_number"],
            str(by_email.json()["total"]),
        )
        by_number = await c.get("/merchandise/orders", headers=ah, params={"q": order["order_number"]})
        check("pencarian by nomor order", by_number.json()["total"] == 1)
        filtered = await c.get("/merchandise/orders", headers=ah, params={"order_status": "SHIPPED"})
        check("filter status order (SHIPPED → 0)", filtered.json()["total"] == 0)
        pay_filtered = await c.get("/merchandise/orders", headers=ah, params={"payment_status": "PENDING"})
        check("filter status pembayaran (PENDING → 2)", pay_filtered.json()["total"] == 2)

        # ------------------------------------------------ 3. admin detail
        detail = (await c.get(f"/merchandise/orders/{order['id']}", headers=ah)).json()
        check(
            "detail: snapshot item + harga saat order + timeline + transisi",
            detail["items"][0]["unit_price"] == 150000
            and detail["customer"]["email"] == CUSTOMER["email"]
            and detail["shipping"]["address"] == SHIPPING["address"]
            and [t["status"] for t in detail["allowed_transitions"]] == ["PROCESSING", "CANCELLED"]
            and detail["timeline"][0]["event"] == "ORDER_CREATED",
            str([t["status"] for t in detail["allowed_transitions"]]),
        )
        check(
            "detail tidak membocorkan payload provider",
            "payment_raw" not in detail and "payment_provider_payload" not in detail,
        )

        # -------------------------------------- 4. transisi tidak valid
        async def patch_status(oid, status, note=None):
            body = {"order_status": status}
            if note:
                body["note"] = note
            return await c.patch(f"/merchandise/orders/{oid}/status", headers=ah, json=body)

        skip_shipped = await patch_status(order["id"], "SHIPPED")
        check(
            "PENDING → SHIPPED ditolak server",
            skip_shipped.status_code == 422 and "tidak diizinkan" in skip_shipped.text,
            str(skip_shipped.status_code),
        )
        skip_completed = await patch_status(order["id"], "COMPLETED")
        check("PENDING → COMPLETED ditolak server", skip_completed.status_code == 422)
        refunded = await patch_status(order["id"], "REFUNDED")
        check(
            "status REFUNDED tidak bisa diset manual (refund di luar Fase 3)",
            refunded.status_code == 422 and "pengembalian dana" in refunded.text,
        )
        same = await patch_status(order["id"], "PENDING")
        check("transisi ke status yang sama ditolak", same.status_code == 422)
        unknown = await patch_status(order["id"], "SUPERSHIPPED")
        check("status di luar enum → 422", unknown.status_code == 422)

        # ------------------------------------------ 5. transisi valid
        processing = await patch_status(order["id"], "PROCESSING", note="Konfirmasi manual staging")
        pdata = processing.json()
        check(
            "PENDING → PROCESSING valid (gateway belum dikonfigurasi) + timestamp + timeline",
            processing.status_code == 200
            and pdata["order_status"] == "PROCESSING"
            and pdata["processing_at"]
            and len(pdata["timeline"]) == 2
            and pdata["timeline"][-1]["event"] == "PROCESSING"
            and pdata["timeline"][-1]["from_status"] == "PENDING"
            and pdata["timeline"][-1]["actor"] == settings.BOOTSTRAP_ADMIN_EMAIL
            and pdata["timeline"][-1]["actor_type"] == "ADMIN"
            and pdata["timeline"][-1]["note"] == "Konfirmasi manual staging",
            str(processing.status_code),
        )
        packed = await patch_status(order["id"], "PACKED")
        check(
            "PROCESSING → PACKED valid + histori lama tetap utuh (immutable)",
            packed.status_code == 200
            and packed.json()["order_status"] == "PACKED"
            and [t["event"] for t in packed.json()["timeline"]] == ["ORDER_CREATED", "PROCESSING", "PACKED"]
            and packed.json()["packed_at"],
            str([t["event"] for t in packed.json()["timeline"]]),
        )
        jump = await patch_status(order["id"], "SHIPPED")
        check(
            "PACKED → SHIPPED langsung ditolak (harus READY_TO_SHIP)",
            jump.status_code == 422 and "tidak diizinkan" in jump.text,
        )
        no_awb = await patch_status(order["id"], "READY_TO_SHIP")
        check(
            "READY_TO_SHIP tanpa resi ditolak server",
            no_awb.status_code == 422 and "resi" in no_awb.text.lower(),
            str(no_awb.status_code),
        )
        blocked_action = next(
            t for t in packed.json()["allowed_transitions"] if t["status"] == "READY_TO_SHIP"
        )
        check(
            "UI dapat alasan blokir (allowed=false + blocked_reason)",
            blocked_action["allowed"] is False and "resi" in (blocked_action["blocked_reason"] or "").lower(),
            str(blocked_action),
        )

        # ------------------------------------------------- 6. AWB / resi
        empty = await c.patch(f"/merchandise/orders/{order['id']}/fulfilment", headers=ah, json={})
        check("simpan pengiriman tanpa data → 422", empty.status_code == 422)
        blank_awb = await c.patch(
            f"/merchandise/orders/{order['id']}/fulfilment", headers=ah, json={"awb_number": "   "}
        )
        check("resi kosong/spasi → 422 (tidak tersimpan)", blank_awb.status_code == 422, str(blank_awb.status_code))
        short_awb = await c.patch(
            f"/merchandise/orders/{order['id']}/fulfilment", headers=ah, json={"awb_number": "12"}
        )
        check("resi terlalu pendek → 422", short_awb.status_code == 422)
        saved = await c.patch(
            f"/merchandise/orders/{order['id']}/fulfilment",
            headers=ah,
            json={"courier_code": "jne", "service_code": "REG", "awb_number": "JNE0099887766"},
        )
        sdata = saved.json()
        raw_after = await db[Collections.ORDERS].find_one({"id": order["id"]})
        check(
            "resi + kurir tersimpan & tampil di detail",
            saved.status_code == 200
            and sdata["shipment"]["awb_number"] == "JNE0099887766"
            and sdata["shipment"]["courier_code"] == "jne"
            and sdata["shipment"]["service_code"] == "REG"
            and raw_after["fulfilment"]["updated_by"] == settings.BOOTSTRAP_ADMIN_EMAIL,
            str(sdata["shipment"]),
        )
        check(
            "snapshot checkout tidak ditimpa oleh data fulfilment",
            raw_after["shipping"] == raw["shipping"] and "awb_number" not in raw_after["shipping"],
        )
        check(
            "SHIPPING_UPDATED masuk timeline",
            sdata["timeline"][-1]["event"] == "SHIPPING_UPDATED"
            and "JNE0099887766" in (sdata["timeline"][-1]["note"] or ""),
            str(sdata["timeline"][-1]),
        )

        ready = await patch_status(order["id"], "READY_TO_SHIP")
        check(
            "PACKED → READY_TO_SHIP valid setelah resi diisi",
            ready.status_code == 200 and ready.json()["order_status"] == "READY_TO_SHIP" and ready.json()["ready_to_ship_at"],
            str(ready.status_code),
        )
        shipped = await patch_status(order["id"], "SHIPPED")
        check(
            "READY_TO_SHIP → SHIPPED valid + shipped_at",
            shipped.status_code == 200 and shipped.json()["shipped_at"],
        )
        completed = await patch_status(order["id"], "COMPLETED")
        check(
            "SHIPPED → COMPLETED valid + tidak ada aksi lanjutan",
            completed.status_code == 200
            and completed.json()["order_status"] == "COMPLETED"
            and completed.json()["allowed_transitions"] == []
            and completed.json()["completed_at"],
            str(completed.json()["allowed_transitions"]),
        )
        back = await patch_status(order["id"], "PROCESSING")
        check(
            "COMPLETED tidak bisa balik ke PROCESSING",
            back.status_code == 422 and "final" in back.text.lower(),
            str(back.status_code),
        )
        late_awb = await c.patch(
            f"/merchandise/orders/{order['id']}/fulfilment", headers=ah, json={"awb_number": "JNE1111111111"}
        )
        check("order final: data pengiriman tidak bisa diubah", late_awb.status_code == 422)
        final_timeline = (await c.get(f"/merchandise/orders/{order['id']}", headers=ah)).json()["timeline"]
        check(
            "timeline lengkap & berurutan (7 event, histori tidak terhapus)",
            [t["event"] for t in final_timeline]
            == [
                "ORDER_CREATED",
                "PROCESSING",
                "PACKED",
                "SHIPPING_UPDATED",
                "READY_TO_SHIP",
                "SHIPPED",
                "COMPLETED",
            ],
            str([t["event"] for t in final_timeline]),
        )

        # ------------------------------------------- 7. cancel + final
        cancelled = await patch_status(second["id"], "CANCELLED", note="Pembeli membatalkan")
        check(
            "PENDING → CANCELLED valid",
            cancelled.status_code == 200 and cancelled.json()["order_status"] == "CANCELLED",
        )
        pack_cancelled = await patch_status(second["id"], "PACKED")
        check("order CANCELLED tidak bisa dipacking", pack_cancelled.status_code == 422)
        awb_cancelled = await c.patch(
            f"/merchandise/orders/{second['id']}/fulfilment", headers=ah, json={"awb_number": "JNE2222222222"}
        )
        check("order CANCELLED tidak bisa diberi resi", awb_cancelled.status_code == 422)

        # --------------------------- 8. gating pembayaran saat gateway aktif
        third = (await make_order("ketiga.p3@sandbox-alsabbat.dev")).json()["order"]
        await c.put(
            "/settings/integrations",
            headers=ah,
            json={"values": {"MIDTRANS_SERVER_KEY": "SB-Mid-server-SANDBOX", "MIDTRANS_CLIENT_KEY": "SB-Mid-client-SANDBOX"}},
        )
        gated = await patch_status(third["id"], "PROCESSING")
        check(
            "gateway aktif + belum PAID → PROCESSING ditolak",
            gated.status_code == 422 and "PAID" in gated.text,
            str(gated.status_code),
        )
        await db[Collections.ORDERS].update_one({"id": third["id"]}, {"$set": {"payment_status": "PAID"}})
        gated_ok = await patch_status(third["id"], "PROCESSING")
        check("gateway aktif + PAID → PROCESSING diizinkan", gated_ok.status_code == 200)
        await c.put(
            "/settings/integrations",
            headers=ah,
            json={"values": {"MIDTRANS_SERVER_KEY": "", "MIDTRANS_CLIENT_KEY": ""}},
        )

        # --------------------------------- 9. tampilan untuk pelanggan
        tracked = await c.get(
            "/merchandise/orders/track",
            params={"order_number": order["order_number"], "email": CUSTOMER["email"]},
        )
        tdata = tracked.json()
        check(
            "lacak pesanan (guest): status + timeline + resi tampil",
            tracked.status_code == 200
            and tdata["order_status"] == "COMPLETED"
            and len(tdata["timeline"]) == 7
            and tdata["shipment"]["awb_number"] == "JNE0099887766",
            str(len(tdata.get("timeline") or [])),
        )
        check(
            "timeline pelanggan tanpa email admin / catatan internal",
            settings.BOOTSTRAP_ADMIN_EMAIL not in tracked.text
            and all("actor" not in e and "note" not in e for e in tdata["timeline"])
            and "fulfilment" not in tdata,
            str(tdata["timeline"][1]),
        )
        check(
            "label progres pesanan tersedia untuk pelanggan",
            tdata["timeline"][-1]["label"] == "Selesai" and tdata["timeline"][-1]["source"] == "TOKO",
            str(tdata["timeline"][-1]),
        )

        # ------------------------- 10. kompatibilitas order lama & snapshot
        legacy_id = new_id()
        await db[Collections.ORDERS].insert_one(
            {
                "id": legacy_id,
                "order_number": "ALS-LEGACY-000001",
                "customer": CUSTOMER,
                "shipping": SHIPPING,
                "items": [
                    {
                        "product_id": product["id"],
                        "variant_id": None,
                        "product_name": "Jersey Lama",
                        "quantity": 2,
                        "unit_price": 99000,
                        "subtotal": 198000,
                    }
                ],
                "subtotal": 198000,
                "shipping_cost": 0,
                "total": 198000,
                "order_status": "PROCESSING",
                "payment_status": "PAID",
                "created_at": utcnow().isoformat(),
            }
        )
        legacy = await c.get(f"/merchandise/orders/{legacy_id}", headers=ah)
        ldata = legacy.json()
        check(
            "order lama tanpa timeline/fulfilment tetap terbaca (ORDER_CREATED diturunkan)",
            legacy.status_code == 200
            and ldata["timeline"][0]["event"] == "ORDER_CREATED"
            and ldata["timeline"][0]["actor_type"] == "DERIVED"
            and [t["status"] for t in ldata["allowed_transitions"]] == ["PACKED", "CANCELLED"]
            and ldata["items"][0]["unit_price"] == 99000,
            str(ldata["timeline"][0]),
        )
        legacy_raw = await db[Collections.ORDERS].find_one({"id": legacy_id})
        check(
            "membaca order lama TIDAK menulis timeline ke database (tanpa migrasi)",
            "timeline" not in legacy_raw,
        )

        await c.patch(
            f"/merchandise/catalog/products/{product['id']}", headers=ah, json={"price": 999000}
        )
        after_price = (await c.get(f"/merchandise/orders/{order['id']}", headers=ah)).json()
        check(
            "harga histori tidak berubah walau harga katalog diubah",
            after_price["items"][0]["unit_price"] == 150000 and after_price["total"] == 150000,
            str(after_price["items"][0]["unit_price"]),
        )

        # ------------------------------------------ 11. notifikasi in-app
        notif_count = await db[Collections.NOTIFICATIONS].count_documents({})
        check(
            "notifikasi guest (tanpa akun) tidak dibuat — tidak ada provider palsu",
            notif_count == 0,
            str(notif_count),
        )
        sample = {
            "id": "x",
            "order_number": "ALS-X",
            "customer_id": "cust-p3",
            "order_status": "SHIPPED",
            "shipping": {},
            "fulfilment": {"courier_name": "JNE", "awb_number": "JNE0099887766"},
        }
        await fulfil.notify_customer_status(sample, "SHIPPED")
        stored = await db[Collections.NOTIFICATIONS].find_one({"recipient_id": "cust-p3"})
        check(
            "pesanan milik member → notifikasi in-app (pusat notifikasi existing)",
            stored is not None
            and stored["audience"] == "CUSTOMER"
            and stored["type"] == "ORDER_STATUS"
            and "JNE0099887766" in stored["message"],
            str((stored or {}).get("message")),
        )

        # ------------------------------------------ 12. regresi Fase 1/1B/2
        catalog = await c.get("/merchandise/products")
        check(
            "regresi Fase 1: katalog publik + weight_grams tetap ada",
            catalog.status_code == 200 and catalog.json()["items"][0]["weight_grams"] == 600,
        )
        ship_cfg = await c.get("/merchandise/shipping/config")
        check(
            "regresi Fase 2: config ongkir tetap jujur tanpa rahasia",
            ship_cfg.status_code == 200 and ship_cfg.json()["configured"] is False,
        )
        revalidate = await c.post(
            "/merchandise/cart/revalidate", json={"items": [{"product_id": product["id"], "quantity": 1}]}
        )
        check(
            "regresi checkout: revalidasi keranjang memakai harga katalog terbaru",
            revalidate.status_code == 200 and revalidate.json()["subtotal"] == 999000,
        )

    failed = [n for n, ok in results if not ok]
    print("\n=== HASIL: %s/%s PASS ===" % (len(results) - len(failed), len(results)))
    for name in failed:
        print("  GAGAL:", name)

    client = get_client()
    await client.drop_database(SANDBOX_DB)
    print("sandbox database di-DROP:", SANDBOX_DB)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
