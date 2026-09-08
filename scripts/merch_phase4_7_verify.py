"""Verifikasi Merchandise Fase 4–7 — COD, delivery pelanggan, refund, hardening, laporan.

Database sandbox sekali-pakai (di-DROP di akhir). NOL tulisan ke database staging.

STUB (hanya di dalam skrip uji, kode aplikasi tidak diubah):
- Transport HTTP RajaOngkir (`shipping._call`) → memverifikasi kapabilitas COD & biaya
  COD yang HANYA berasal dari balasan penyedia.
- `MidtransProvider.refund` → memverifikasi penanganan sukses/gagal refund.
Integrasi LIVE (RajaOngkir Cost/Delivery, Midtrans) tetap NOT VERIFIED karena kredensial
belum tersedia.

Jalankan:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/merch_phase4_7_verify.py
"""
import asyncio
import hashlib
import os
from datetime import datetime, timedelta, timezone

SANDBOX_DB = "alsabbat_merch_p47_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ["BROADCAST_SCHEDULER_ENABLED"] = "false"

import httpx  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

COST_KEY = "ro-cost-SANDBOX"
DELIVERY_KEY_MISSING = True
SERVER_KEY = "SB-Mid-server-SANDBOX"
def _png_bytes() -> bytes:
    from io import BytesIO

    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (40, 40), (1, 40, 145)).save(buffer, format="PNG")
    return buffer.getvalue()


PNG = _png_bytes()
results = []


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


def cost_payload():
    """Balasan ongkir: JNE COD (dengan biaya), SiCepat non-COD, POS COD tanpa biaya."""
    return {
        "meta": {"status": "success", "code": 200},
        "data": [
            {"name": "JNE", "code": "jne", "service": "REG", "cost": 18000, "etd": "2-3 day", "cod": "YES", "cod_fee": 4000},
            {"name": "SiCepat", "code": "sicepat", "service": "BEST", "cost": 27000, "etd": "1 day", "cod": "NO"},
            {"name": "POS", "code": "pos", "service": "KILAT", "cost": 15000, "etd": "3 day", "cod": "YES"},
        ],
    }


DEST = {
    "meta": {"status": "success", "code": 200},
    "data": [{"id": 17594, "label": "CICENDO, BANDUNG, JAWA BARAT, 40172", "city_name": "Bandung", "province_name": "Jawa Barat", "zip_code": "40172"}],
}

SHIP = {"recipient": "Uji 47", "address": "Jl. Sandbox 47", "city": "Bandung", "province": "Jawa Barat", "postal_code": "40172"}
CUST = {"name": "Uji Fase 47", "email": "uji.p47@sandbox-alsabbat.dev", "phone": "08123456789"}


async def main():
    assert settings.DB_NAME == SANDBOX_DB
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()

    from app.main import app
    from app.services import shipping_rajaongkir as shipping
    from app.services.payments import MidtransProvider

    async def fake_call(method, path, **kwargs):
        shipping._api_key()
        return DEST if "destination" in path else cost_payload()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        admin = await c.post("/auth/login", json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD})
        ah = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        # ---------------------------------------------- COD belum dikonfigurasi
        cod_off = await c.get("/merchandise/cod/status")
        check(
            "status COD jujur saat belum dikonfigurasi (tanpa rahasia)",
            cod_off.status_code == 200
            and cod_off.json()["configured"] is False
            and "RAJAONGKIR_DELIVERY_API_KEY" in cod_off.json()["missing_config"]
            and COST_KEY not in cod_off.text,
            str(cod_off.json()["status"]),
        )

        presp = await c.post("/merchandise/catalog/products", headers=ah, json={"name": "Jersey 47", "status": "ACTIVE", "price": 100000, "stock_quantity": 20, "weight_grams": 500})
        product = presp.json()
        if "id" not in product:
            raise SystemExit(f"product create failed: {presp.status_code} {presp.text[:300]}")

        cod_no_shipping = await c.post(
            "/merchandise/checkout",
            json={"items": [{"product_id": product["id"], "quantity": 1}], "customer": CUST, "shipping": SHIP, "payment_method": "COD"},
        )
        check("COD tanpa tujuan/layanan → 422", cod_no_shipping.status_code == 422, str(cod_no_shipping.status_code))

        # ---------------------------------------------- aktifkan ongkir (stub)
        await c.put("/settings/integrations", headers=ah, json={"values": {"RAJAONGKIR_COST_API_KEY": COST_KEY, "SHIPPING_ORIGIN_DESTINATION_ID": "17549"}})
        shipping._call = fake_call
        shipping._cache.clear()

        quote = (await c.post("/merchandise/shipping/quote", json={"items": [{"product_id": product["id"], "quantity": 1}], "destination_id": "17594"})).json()
        options = {f"{o['courier_code']}|{o['service_code']}": o for o in quote["options"]}
        check(
            "kapabilitas COD hanya dari API: JNE COD (fee 4000), SiCepat non-COD, POS tanpa fee → non-COD",
            options["jne|REG"]["cod_available"] is True
            and options["jne|REG"]["cod_fee"] == 4000
            and options["sicepat|BEST"]["cod_available"] is False
            and options["pos|KILAT"]["cod_available"] is False
            and "biaya COD" in (options["pos|KILAT"]["cod_note"] or ""),
            str([(k, v["cod_available"]) for k, v in options.items()]),
        )

        def order_body(courier, service, method, cost, qty=1, email=None, cust_extra=None):
            return {
                "items": [{"product_id": product["id"], "quantity": qty}],
                "customer": {**CUST, **({"email": email} if email else {}), **(cust_extra or {})},
                "shipping": {**SHIP, "destination_id": "17594", "destination_label": "CICENDO", "courier_code": courier, "service_code": service, "shipping_cost": cost},
                "payment_method": method,
            }

        cod_bad = await c.post("/merchandise/checkout", json=order_body("sicepat", "BEST", "COD", 27000))
        check("COD dengan layanan non-COD ditolak server", cod_bad.status_code == 422 and "COD" in cod_bad.text, str(cod_bad.status_code))

        cod_ok = await c.post("/merchandise/checkout", json=order_body("jne", "REG", "COD", 18000))
        cod_order = cod_ok.json()["order"]
        check(
            "checkout COD: total = subtotal + ongkir + biaya COD (server-side)",
            cod_ok.status_code == 201
            and cod_order["subtotal"] == 100000
            and cod_order["shipping_cost"] == 18000
            and cod_order["cod_fee"] == 4000
            and cod_order["total"] == 122000
            and cod_order["payment_method_choice"] == "COD"
            and cod_ok.json()["payment"]["provider"] == "COD",
            str(cod_order["total"]),
        )
        stock_after = (await c.get(f"/merchandise/catalog/products/{product['id']}", headers=ah)).json()["stock_quantity"]
        check("COD mengunci stok saat checkout (20 → 19)", stock_after == 19, str(stock_after))

        cod_ship = await c.post(f"/merchandise/orders/{cod_order['id']}/cod-shipment", headers=ah)
        cod_detail = (await c.get(f"/merchandise/orders/{cod_order['id']}", headers=ah)).json()
        check(
            "pengiriman COD tanpa Delivery API Key → 422 jujur, status TIDAK berubah, gagal tercatat",
            cod_ship.status_code == 422
            and "Delivery API Key" in cod_ship.text
            and cod_detail["order_status"] == "PENDING"
            and cod_detail["timeline"][-1]["event"] == "COD_SHIPMENT_FAILED",
            str(cod_ship.status_code),
        )
        check(
            "COD: transisi PROCESSING tidak menunggu status PAID",
            (await c.patch(f"/merchandise/orders/{cod_order['id']}/status", headers=ah, json={"order_status": "PROCESSING"})).status_code == 200,
        )

        # ------------------------------------------- stok atomik & konkuren
        limited = (await c.post("/merchandise/catalog/products", headers=ah, json={"name": "Limited 47", "status": "ACTIVE", "price": 50000, "stock_quantity": 3, "weight_grams": 300})).json()

        async def buy_limited(i):
            return await c.post(
                "/merchandise/checkout",
                json={
                    "items": [{"product_id": limited["id"], "quantity": 1}],
                    "customer": {**CUST, "email": f"race{i}@sandbox-alsabbat.dev"},
                    "shipping": {**SHIP, "destination_id": "17594", "courier_code": "jne", "service_code": "REG", "shipping_cost": 18000},
                    "payment_method": "COD",
                },
            )

        race = await asyncio.gather(*[buy_limited(i) for i in range(6)], return_exceptions=True)
        created = sum(1 for r in race if getattr(r, "status_code", 0) == 201)
        rejected = sum(1 for r in race if getattr(r, "status_code", 0) == 422)
        stock_doc = await db[Collections.PRODUCTS].find_one({"id": limited["id"]})
        check(
            "6 checkout COD paralel untuk stok 3 → tepat 3 sukses, 3 ditolak, stok 0 (tanpa overselling)",
            created == 3 and rejected == 3 and stock_doc["stock_quantity"] == 0,
            f"created={created} rejected={rejected} stock={stock_doc['stock_quantity']}",
        )
        cancelled_race = await db[Collections.ORDERS].count_documents({"items.product_id": limited["id"], "order_status": "CANCELLED"})
        check("pesanan yang kehabisan stok dibatalkan & stok di-rollback penuh", cancelled_race == 3, str(cancelled_race))

        # ------------------------------------------------ pembayaran & webhook
        mid_order = (await c.post("/merchandise/checkout", json=order_body("jne", "REG", "MIDTRANS", 18000, email="midtrans@sandbox-alsabbat.dev"))).json()["order"]
        check(
            "checkout Midtrans: batas kedaluwarsa disimpan server-side",
            bool(mid_order.get("payment_expires_at")) and mid_order["total"] == 118000,
            str(mid_order.get("payment_expires_at")),
        )
        await c.put("/settings/integrations", headers=ah, json={"values": {"MIDTRANS_SERVER_KEY": SERVER_KEY, "MIDTRANS_CLIENT_KEY": "SB-Mid-client-SANDBOX"}})

        def notif(order_number, gross, status="settlement", txn="TXN-1"):
            code = "200"
            sig = hashlib.sha512(f"{order_number}{code}{gross}{SERVER_KEY}".encode()).hexdigest()
            return {"order_id": order_number, "status_code": code, "gross_amount": gross, "signature_key": sig, "transaction_status": status, "transaction_id": txn, "payment_type": "bank_transfer"}

        bad_sig = await c.post("/merchandise/payment/webhook", json={**notif(mid_order["order_number"], "118000.00"), "signature_key": "palsu"})
        check("webhook signature palsu ditolak", bad_sig.status_code == 422, str(bad_sig.status_code))
        hook = await c.post("/merchandise/payment/webhook", json=notif(mid_order["order_number"], "118000.00"))
        hook_dup = await c.post("/merchandise/payment/webhook", json=notif(mid_order["order_number"], "118000.00"))
        paid = (await c.get(f"/merchandise/orders/{mid_order['id']}", headers=ah)).json()
        logs = [d async for d in db[Collections.PAYMENT_WEBHOOK_LOGS].find({"order_number": mid_order["order_number"]})]
        check(
            "webhook diproses sekali & duplikat tidak memproses ulang",
            hook.status_code == 200 and hook.json()["payment_status"] == "PAID" and hook_dup.json().get("duplicate") is True and paid["payment_status"] == "PAID",
            str(hook_dup.json()),
        )
        check(
            "log webhook tercatat (event, status, hasil) tanpa secret",
            any(log["processing_status"] == "PROCESSED" for log in logs)
            and any(log["processing_status"] == "REJECTED" for log in logs)
            and all(SERVER_KEY not in str(log) for log in logs)
            and all(log["order_number"] == mid_order["order_number"] for log in logs),
            str([(log["processing_status"], log["signature_valid"]) for log in logs]),
        )
        # Idempotency murni per-event: status pembayaran dikembalikan ke PENDING,
        # notifikasi identik TIDAK boleh diproses ulang.
        await db[Collections.ORDERS].update_one({"id": mid_order["id"]}, {"$set": {"payment_status": "PENDING"}})
        replay = await c.post("/merchandise/payment/webhook", json=notif(mid_order["order_number"], "118000.00"))
        replayed_doc = await db[Collections.ORDERS].find_one({"id": mid_order["id"]})
        logs_after = await db[Collections.PAYMENT_WEBHOOK_LOGS].count_documents({"order_number": mid_order["order_number"]})
        check(
            "notifikasi identik yang diulang tidak diproses lagi (dedup per event)",
            replay.json().get("duplicate") is True
            and replayed_doc["payment_status"] == "PENDING"
            and logs_after == len(logs),
            f"logs={logs_after} status={replayed_doc['payment_status']}",
        )
        await db[Collections.ORDERS].update_one({"id": mid_order["id"]}, {"$set": {"payment_status": "PAID"}})
        stock_mid = await db[Collections.PRODUCTS].find_one({"id": product["id"]})
        deducted_flags = await db[Collections.ORDERS].find_one({"id": mid_order["id"]})
        check(
            "stok dikurangi tepat sekali setelah pembayaran terverifikasi",
            deducted_flags["stock_applied"] is True and stock_mid["stock_quantity"] == 18,
            str(stock_mid["stock_quantity"]),
        )

        # ------------------------------------------------- payment expiry
        exp_order = (await c.post("/merchandise/checkout", json=order_body("jne", "REG", "MIDTRANS", 18000, email="expired@sandbox-alsabbat.dev"))).json()["order"]
        await db[Collections.ORDERS].update_one(
            {"id": exp_order["id"]},
            {"$set": {"payment_expires_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}},
        )
        expired = (await c.get(f"/merchandise/orders/{exp_order['id']}", headers=ah)).json()
        check(
            "pembayaran kedaluwarsa diberlakukan server-side (EXPIRED + CANCELLED)",
            expired["payment_status"] == "EXPIRED" and expired["order_status"] == "CANCELLED"
            and any(t["event"] == "PAYMENT_EXPIRED" for t in expired["timeline"]),
            str((expired["payment_status"], expired["order_status"])),
        )
        again = (await c.get(f"/merchandise/orders/{exp_order['id']}", headers=ah)).json()
        restock_events = [t for t in again["timeline"] if t["event"] == "STOCK_RESTOCKED"]
        check("order kedaluwarsa tidak direstock dua kali (stok belum pernah dikurangi)", len(restock_events) == 0, str(len(restock_events)))

        cancel_cod = (await c.post("/merchandise/checkout", json=order_body("jne", "REG", "COD", 18000, email="cancelcod@sandbox-alsabbat.dev"))).json()["order"]
        before_cancel = (await db[Collections.PRODUCTS].find_one({"id": product["id"]}))["stock_quantity"]
        await c.patch(f"/merchandise/orders/{cancel_cod['id']}/status", headers=ah, json={"order_status": "CANCELLED"})
        await c.get(f"/merchandise/orders/{cancel_cod['id']}", headers=ah)
        after_cancel = (await db[Collections.PRODUCTS].find_one({"id": product["id"]}))["stock_quantity"]
        cancel_doc = await db[Collections.ORDERS].find_one({"id": cancel_cod["id"]})
        check(
            "pembatalan COD mengembalikan stok tepat satu kali (idempoten)",
            after_cancel == before_cancel + 1
            and cancel_doc["stock_restocked"] is True
            and len([t for t in cancel_doc["timeline"] if t["event"] == "STOCK_RESTOCKED"]) == 1,
            f"{before_cancel}->{after_cancel}",
        )

        # -------------------------------- akun member untuk alur pelanggan
        reg = await c.post("/baraya/register", json={"full_name": "Member 47", "email": "member47@sandbox-alsabbat.dev", "password": "Sandbox123", "password_confirmation": "Sandbox123", "phone": "08129999888", "accepted_terms": True})
        await db[Collections.CUSTOMERS].update_one({"email": "member47@sandbox-alsabbat.dev"}, {"$set": {"email_verified": True, "status": "ACTIVE"}})
        login = await c.post("/baraya/login", json={"email": "member47@sandbox-alsabbat.dev", "password": "Sandbox123"})
        if "access_token" not in login.json():
            raise SystemExit(f"login gagal: reg={reg.status_code} {reg.text[:200]} login={login.status_code} {login.text[:300]}")
        ch = {"Authorization": f"Bearer {login.json()['access_token']}"}
        check("akun member sandbox siap (register + login)", reg.status_code in (200, 201) and login.status_code == 200, str(login.status_code))

        member_order = (await c.post("/merchandise/checkout", headers=ch, json=order_body("jne", "REG", "COD", 18000, email="member47@sandbox-alsabbat.dev"))).json()["order"]
        for target in ("PROCESSING", "PACKED"):
            await c.patch(f"/merchandise/orders/{member_order['id']}/status", headers=ah, json={"order_status": target})
        await c.patch(f"/merchandise/orders/{member_order['id']}/fulfilment", headers=ah, json={"courier_code": "jne", "service_code": "REG", "awb_number": "JNE470001"})
        for target in ("READY_TO_SHIP", "SHIPPED"):
            await c.patch(f"/merchandise/orders/{member_order['id']}/status", headers=ah, json={"order_status": target})

        progress = (await c.get(f"/baraya/orders/{member_order['id']}", headers=ch)).json()
        check(
            "pelanggan melihat progres: status, kurir, layanan, AWB, timeline",
            progress["order_status"] == "SHIPPED"
            and progress["shipment"]["awb_number"] == "JNE470001"
            and progress["shipment"]["service_code"] == "REG"
            and len(progress["timeline"]) >= 6
            and progress["can_confirm_received"] is True,
            str(progress["shipment"]),
        )
        check("pelanggan tidak melihat identitas admin di timeline", settings.BOOTSTRAP_ADMIN_EMAIL not in str(progress))

        # evidence upload + ownership
        ev = await c.post(f"/baraya/orders/{member_order['id']}/evidence", headers=ch, files={"file": ("bukti.png", PNG, "image/png")})
        check("unggah bukti foto (Media Library existing)", ev.status_code == 200 and ev.json()["url"], str(ev.status_code))
        bad_file = await c.post(f"/baraya/orders/{member_order['id']}/evidence", headers=ch, files={"file": ("virus.txt", b"<script>x</script>", "text/plain")})
        check("bukti non-gambar ditolak", bad_file.status_code == 422, str(bad_file.status_code))
        foreign = await c.post(f"/baraya/orders/{cod_order['id']}/evidence", headers=ch, files={"file": ("bukti.png", PNG, "image/png")})
        check("tidak bisa unggah bukti untuk pesanan orang lain (404)", foreign.status_code == 404, str(foreign.status_code))
        no_auth = await c.get(f"/baraya/orders/{member_order['id']}")
        check("akses pesanan tanpa token → 401", no_auth.status_code in (401, 403), str(no_auth.status_code))

        # confirm received (COD → PAID)
        recv = await c.post(f"/baraya/orders/{member_order['id']}/receive", headers=ch)
        recv_again = await c.post(f"/baraya/orders/{member_order['id']}/receive", headers=ch)
        check(
            "Barang Diterima: COMPLETED + timestamp + actor + COD jadi PAID",
            recv.status_code == 200
            and recv.json()["order_status"] == "COMPLETED"
            and recv.json()["payment_status"] == "PAID"
            and any(t["event"] == "RECEIVED_CONFIRMED" for t in recv.json()["timeline"]),
            str(recv.status_code),
        )
        check("Barang Diterima hanya bisa sekali", recv_again.status_code == 422, str(recv_again.status_code))

        # reject flow
        reject_order = (await c.post("/merchandise/checkout", headers=ch, json=order_body("jne", "REG", "COD", 18000, email="member47@sandbox-alsabbat.dev"))).json()["order"]
        for target in ("PROCESSING", "PACKED"):
            await c.patch(f"/merchandise/orders/{reject_order['id']}/status", headers=ah, json={"order_status": target})
        await c.patch(f"/merchandise/orders/{reject_order['id']}/fulfilment", headers=ah, json={"courier_code": "jne", "service_code": "REG", "awb_number": "JNE470002"})
        for target in ("READY_TO_SHIP", "SHIPPED"):
            await c.patch(f"/merchandise/orders/{reject_order['id']}/status", headers=ah, json={"order_status": target})
        no_reason = await c.post(f"/baraya/orders/{reject_order['id']}/reject", headers=ch, json={"reason": "x", "detail": "y"})
        check("reject tanpa alasan valid → 422", no_reason.status_code == 422, str(no_reason.status_code))
        rejected = await c.post(
            f"/baraya/orders/{reject_order['id']}/reject",
            headers=ch,
            json={"reason": "Barang rusak", "detail": "Kemasan penyok dan jersey sobek di bagian bahu.", "evidence_urls": [ev.json()["url"]]},
        )
        rejected_doc = await db[Collections.ORDERS].find_one({"id": reject_order["id"]})
        check(
            "reject tercatat (status REJECTED, alasan, detail, bukti, actor, timestamp)",
            rejected.status_code == 200
            and rejected.json()["order_status"] == "REJECTED"
            and rejected_doc["delivery"]["reject_reason"] == "Barang rusak"
            and rejected_doc["delivery"]["evidence_urls"]
            and rejected_doc["delivery"]["rejected_at"],
            str(rejected.status_code),
        )
        check(
            "reject TIDAK otomatis refund (payment_status belum REFUNDED)",
            rejected_doc["payment_status"] != "REFUNDED" and rejected.json()["refund"] is None,
        )
        check("reject dua kali ditolak", (await c.post(f"/baraya/orders/{reject_order['id']}/reject", headers=ch, json={"reason": "Barang rusak", "detail": "Percobaan kedua harus ditolak."})).status_code == 422)

        # ------------------------------------------------------- refund COD
        refund = await c.post(f"/baraya/orders/{reject_order['id']}/refund", headers=ch, json={"reason": "Barang rusak", "detail": "Mohon dana dikembalikan.", "bank_account": "BCA 123456"})
        refund_doc = refund.json()
        check(
            "refund diajukan pelanggan (REQUESTED, metode COD_MANUAL)",
            refund.status_code == 200 and refund_doc["status"] == "REQUESTED" and refund_doc["method"] == "COD_MANUAL" and refund_doc["amount"] == 122000,
            str(refund_doc["status"]),
        )
        dup = await c.post(f"/baraya/orders/{reject_order['id']}/refund", headers=ch, json={"reason": "Barang rusak", "detail": "Pengajuan kedua harus ditolak."})
        check("refund ganda ditolak", dup.status_code == 422, str(dup.status_code))
        pending_order = (await c.post("/merchandise/checkout", headers=ch, json=order_body("jne", "REG", "MIDTRANS", 18000, email="member47@sandbox-alsabbat.dev"))).json()["order"]
        not_eligible = await c.post(f"/baraya/orders/{pending_order['id']}/refund", headers=ch, json={"reason": "Berubah pikiran", "detail": "Belum dikirim, harus ditolak."})
        check("refund untuk pesanan yang belum dikirim ditolak", not_eligible.status_code == 422, str(not_eligible.status_code))

        listed = await c.get("/merchandise/refunds", headers=ah, params={"status": "REQUESTED"})
        check("admin melihat daftar refund", listed.status_code == 200 and listed.json()["total"] == 1, str(listed.json()["total"]))
        bad_transition = await c.post(f"/merchandise/refunds/{refund_doc['id']}/manual-transfer", headers=ah, json={"amount": 122000, "transfer_reference": "TRF-1"})
        check("transfer manual sebelum PROCESSING ditolak", bad_transition.status_code == 422, str(bad_transition.status_code))
        review = await c.patch(f"/merchandise/refunds/{refund_doc['id']}/review", headers=ah, json={"decision": "APPROVED", "note": "Bukti valid"})
        check(
            "admin menyetujui refund (+alasan keputusan & audit)",
            review.status_code == 200 and review.json()["status"] == "APPROVED" and review.json()["decision_note"] == "Bukti valid",
            str(review.status_code),
        )
        process = await c.post(f"/merchandise/refunds/{refund_doc['id']}/process", headers=ah)
        check("refund COD → PROCESSING menunggu transfer manual", process.json()["status"] == "PROCESSING")
        over = await c.post(f"/merchandise/refunds/{refund_doc['id']}/manual-transfer", headers=ah, json={"amount": 999999, "transfer_reference": "TRF-X"})
        check("nominal transfer melebihi nilai pesanan ditolak", over.status_code == 422)
        done = await c.post(f"/merchandise/refunds/{refund_doc['id']}/manual-transfer", headers=ah, json={"amount": 122000, "transfer_reference": "TRF-COD-001", "note": "Transfer BCA"})
        order_after = await db[Collections.ORDERS].find_one({"id": reject_order["id"]})
        check(
            "refund COD selesai → order REFUNDED + stok kembali sekali + audit",
            done.json()["status"] == "COMPLETED"
            and done.json()["transfer_reference"] == "TRF-COD-001"
            and order_after["order_status"] == "REFUNDED"
            and order_after["payment_status"] == "REFUNDED"
            and order_after["stock_restocked"] is True
            and len([t for t in order_after["timeline"] if t["event"] == "STOCK_RESTOCKED"]) == 1,
            str(done.json()["status"]),
        )
        check("refund yang sudah COMPLETED tidak bisa diproses lagi", (await c.post(f"/merchandise/refunds/{refund_doc['id']}/process", headers=ah)).status_code == 422)
        check("refund selesai → pengajuan baru ditolak", (await c.post(f"/baraya/orders/{reject_order['id']}/refund", headers=ch, json={"reason": "Lagi", "detail": "Harus ditolak karena sudah refund."})).status_code == 422)

        # -------------------------------------------------- refund Midtrans
        mid_refund_order = (await c.post("/merchandise/checkout", headers=ch, json=order_body("jne", "REG", "MIDTRANS", 18000, email="member47@sandbox-alsabbat.dev"))).json()["order"]
        await c.post("/merchandise/payment/webhook", json=notif(mid_refund_order["order_number"], "118000.00", txn="TXN-2"))
        for target in ("PACKED",):
            await c.patch(f"/merchandise/orders/{mid_refund_order['id']}/status", headers=ah, json={"order_status": target})
        await c.patch(f"/merchandise/orders/{mid_refund_order['id']}/fulfilment", headers=ah, json={"courier_code": "jne", "service_code": "REG", "awb_number": "JNE470003"})
        for target in ("READY_TO_SHIP", "SHIPPED"):
            await c.patch(f"/merchandise/orders/{mid_refund_order['id']}/status", headers=ah, json={"order_status": target})
        mr = (await c.post(f"/baraya/orders/{mid_refund_order['id']}/refund", headers=ch, json={"reason": "Salah ukuran", "detail": "Ukuran tidak sesuai pesanan."})).json()
        check("refund pesanan Midtrans memakai metode MIDTRANS", mr["method"] == "MIDTRANS", str(mr["method"]))
        await c.patch(f"/merchandise/refunds/{mr['id']}/review", headers=ah, json={"decision": "APPROVED"})

        calls = []

        async def fake_refund_fail(self, order, amount, reason):
            calls.append(("fail", amount))
            return {"ok": False, "status": "TRANSPORT_ERROR", "message": "Gagal menghubungi Midtrans."}

        MidtransProvider.refund = fake_refund_fail
        failed = await c.post(f"/merchandise/refunds/{mr['id']}/process", headers=ah)
        order_fail = await db[Collections.ORDERS].find_one({"id": mid_refund_order["id"]})
        check(
            "refund Midtrans gagal → status FAILED, order TIDAK dianggap refunded",
            failed.json()["status"] == "FAILED" and order_fail["payment_status"] == "PAID",
            str(failed.json()["status"]),
        )

        async def fake_refund_ok(self, order, amount, reason):
            calls.append(("ok", amount))
            return {"ok": True, "status": "REFUND", "reference": "REF-MID-1", "message": "refund ok"}

        MidtransProvider.refund = fake_refund_ok
        retried = await c.post(f"/merchandise/refunds/{mr['id']}/process", headers=ah)
        order_refunded = await db[Collections.ORDERS].find_one({"id": mid_refund_order["id"]})
        check(
            "refund Midtrans sukses → COMPLETED + referensi provider + order REFUNDED",
            retried.json()["status"] == "COMPLETED"
            and retried.json()["provider_reference"] == "REF-MID-1"
            and order_refunded["payment_status"] == "REFUNDED"
            and calls[-1][1] == 118000,
            str(retried.json()["status"]),
        )
        check("nominal refund = total order (dihitung server, bukan klien)", calls == [("fail", 118000), ("ok", 118000)], str(calls))

        # ------------------------------------------------- proteksi transisi
        check("COMPLETED → PROCESSING ditolak", (await c.patch(f"/merchandise/orders/{member_order['id']}/status", headers=ah, json={"order_status": "PROCESSING"})).status_code == 422)
        check("CANCELLED → SHIPPED ditolak", (await c.patch(f"/merchandise/orders/{cancel_cod['id']}/status", headers=ah, json={"order_status": "SHIPPED"})).status_code == 422)
        check("REFUNDED → PROCESSING ditolak", (await c.patch(f"/merchandise/orders/{reject_order['id']}/status", headers=ah, json={"order_status": "PROCESSING"})).status_code == 422)
        check("REJECTED → SHIPPED ditolak", (await c.patch(f"/merchandise/orders/{mid_refund_order['id']}/status", headers=ah, json={"order_status": "SHIPPED"})).status_code == 422)
        check("refund tanpa token admin ditolak", (await c.get("/merchandise/refunds")).status_code in (401, 403))
        check("laporan tanpa token admin ditolak", (await c.get("/reports/sales")).status_code in (401, 403))

        # ------------------------------------------------------ audit trail
        audited = await db[Collections.ORDERS].find_one({"id": reject_order["id"]})
        events = [t["event"] for t in audited["timeline"]]
        check(
            "audit trail lengkap pada satu pesanan (order, stok, delivery, refund)",
            {"ORDER_CREATED", "STOCK_DEDUCTED", "PROCESSING", "PACKED", "SHIPPING_UPDATED", "SHIPPED", "REJECTED_BY_CUSTOMER", "REFUND_REQUESTED", "REFUND_APPROVED", "REFUND_PROCESSING", "REFUND_COMPLETED", "STOCK_RESTOCKED"}.issubset(set(events)),
            str(events),
        )
        notif_count = await db[Collections.NOTIFICATIONS].count_documents({"type": "REFUND_STATUS"})
        check("notifikasi refund memakai pusat notifikasi existing", notif_count >= 4, str(notif_count))

        # -------------------------------------------------- laporan penjualan
        report = await c.get("/reports/sales", headers=ah, params={"period": "today", "granularity": "day"})
        rdata = report.json()
        summary = rdata["summary"]
        expected_gross = summary["gross_sales"]
        check(
            "dashboard penjualan: gross/net/ongkir/COD/refund + definisi",
            report.status_code == 200
            and summary["counted_orders"] > 0
            and summary["net_sales"] == summary["gross_sales"] + summary["shipping_amount"] + summary["cod_fee"] - summary["total_refund"]
            and summary["total_refund"] == 240000
            and rdata["definitions"]["net_sales"],
            f"gross={expected_gross} refund={summary['total_refund']}",
        )
        check(
            "pesanan PENDING/CANCELLED tidak dihitung sebagai penjualan",
            summary["orders_by_status"]["CANCELLED"] >= 1 and summary["counted_orders"] < summary["total_orders"],
            str((summary["counted_orders"], summary["total_orders"])),
        )
        check(
            "breakdown metode pembayaran (MIDTRANS & COD) tersedia",
            {row["method"] for row in summary["payment_methods"]} == {"MIDTRANS", "COD"} and any(row["orders"] > 0 for row in summary["payment_methods"]),
            str(summary["payment_methods"]),
        )
        check("breakdown status pesanan tersedia", len(summary["status_breakdown"]) >= 3, str(len(summary["status_breakdown"])))
        check(
            "laporan refund (permintaan, selesai, nominal)",
            summary["refunds"]["total_requests"] >= 2 and summary["refunds"]["by_status"]["COMPLETED"]["count"] == 2 and summary["refunds"]["by_status"]["FAILED"]["count"] == 0,
            str(summary["refunds"]["by_status"]["COMPLETED"]),
        )
        check("laporan pengiriman per kurir/layanan + kiriman COD", any(row["courier"] == "jne" and row["shipments"] > 0 for row in rdata["shipping"]), str(rdata["shipping"][:1]))
        check("tren penjualan harian terisi", len(rdata["trend"]["points"]) >= 1 and rdata["trend"]["points"][0]["gross_sales"] > 0, str(rdata["trend"]["points"][:1]))
        week = await c.get("/reports/sales", headers=ah, params={"period": "this_week", "granularity": "week"})
        month = await c.get("/reports/sales", headers=ah, params={"period": "this_month", "granularity": "month"})
        last_month = await c.get("/reports/sales", headers=ah, params={"period": "last_month"})
        custom = await c.get("/reports/sales", headers=ah, params={"period": "custom", "date_from": "2020-01-01", "date_to": "2020-01-31"})
        bad_custom = await c.get("/reports/sales", headers=ah, params={"period": "custom"})
        check(
            "filter tanggal: today/this_week/this_month/last_month/custom (WIB)",
            week.status_code == 200 and month.status_code == 200 and last_month.json()["summary"]["counted_orders"] == 0
            and custom.json()["summary"]["gross_sales"] == 0 and bad_custom.status_code == 422
            and month.json()["period"]["timezone"].startswith("Asia/Jakarta"),
            str((last_month.json()["summary"]["counted_orders"], custom.json()["summary"]["gross_sales"])),
        )
        products_report = await c.get("/reports/sales/products", headers=ah, params={"period": "today", "sort_by": "revenue"})
        pdata = products_report.json()
        check(
            "laporan produk (qty, gross, refund qty, net) + urut revenue",
            products_report.status_code == 200
            and pdata["items"]
            and pdata["items"][0]["gross_sales"] >= pdata["items"][-1]["gross_sales"]
            and any(row["refund_quantity"] > 0 for row in pdata["items"]),
            str(pdata["items"][0]),
        )
        check("laporan kategori tersedia (produk tanpa kategori → 'Tanpa Kategori')", any(row["category"] == "Tanpa Kategori" for row in pdata["categories"]), str(pdata["categories"][:1]))
        export = await c.get("/reports/sales/export.csv", headers=ah, params={"period": "today"})
        body = export.text
        check(
            "ekspor CSV mengikuti filter & tanpa secret",
            export.status_code == 200
            and "text/csv" in export.headers.get("content-type", "")
            and "RINGKASAN" in body and "PRODUK" in body and "REFUND" in body
            and SERVER_KEY not in body and COST_KEY not in body and "password" not in body.lower(),
            str(export.headers.get("content-type")),
        )

        # --------------------------------------------- regresi Fase 1/1B/2/3
        catalog = await c.get("/merchandise/products")
        jersey = next((i for i in catalog.json()["items"] if i["name"] == "Jersey 47"), None)
        check(
            "regresi Fase 1/1B: katalog publik + weight_grams + galeri",
            catalog.status_code == 200 and jersey is not None and jersey["weight_grams"] == 500 and "in_stock" in jersey,
            str((jersey or {}).get("weight_grams")),
        )
        legacy_checkout = await c.post("/merchandise/checkout", json=order_body("jne", "REG", "MIDTRANS", 18000, email="legacy@sandbox-alsabbat.dev"))
        check("regresi Fase 2: checkout Midtrans + ongkir server-side tetap jalan", legacy_checkout.status_code == 201 and legacy_checkout.json()["order"]["shipping_cost"] == 18000)
        snapshot = (await c.get(f"/merchandise/orders/{member_order['id']}", headers=ah)).json()
        check(
            "regresi Fase 3: snapshot harga/alamat/timeline/AWB utuh",
            snapshot["items"][0]["unit_price"] == 100000
            and snapshot["shipping"]["address"] == SHIP["address"]
            and snapshot["shipment"]["awb_number"] == "JNE470001"
            and snapshot["timeline"][0]["event"] == "ORDER_CREATED",
        )

    failed_names = [n for n, ok in results if not ok]
    print("\n=== HASIL: %s/%s PASS ===" % (len(results) - len(failed_names), len(results)))
    for name in failed_names:
        print("  GAGAL:", name)
    client = get_client()
    await client.drop_database(SANDBOX_DB)
    print("sandbox database di-DROP:", SANDBOX_DB)
    return 1 if failed_names else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
