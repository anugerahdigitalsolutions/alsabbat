"""Fase 13 — checkout↔customer relationship check on throwaway data (removed at end)."""
import asyncio, os, sys
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

BASE = os.environ["REACT_APP_BACKEND_URL"] + "/api"
URI = os.environ.get("MONGODB_URI") or os.environ["MONGO_URL"]
DB = os.environ.get("MONGODB_DB_NAME") or os.environ["DB_NAME"]
C = {"full_name": "Checkout Verify", "email": "checkout.phase13@barayaverify.dev", "phone": "+628110000009",
     "password": "Checkout1234", "password_confirmation": "Checkout1234"}
PRODUCT_ID = "phase13verifyproduct"
ok = True


def log(name, passed, extra=""):
    global ok
    ok = ok and passed
    print(("PASS " if passed else "FAIL ") + name + (f"  {extra}" if extra else ""))


async def main():
    db = AsyncIOMotorClient(URI)[DB]
    await db.customers.delete_many({"email": C["email"]})
    await db.products.delete_many({"id": PRODUCT_ID})
    await db.products.insert_one({
        "id": PRODUCT_ID, "name": "Verifikasi Fase 13", "slug": "verifikasi-fase-13-throwaway",
        "status": "ACTIVE", "price": 150000, "currency": "IDR", "stock_quantity": 5,
        "media_ids": [], "display_order": 9999,
        "created_at": "2026-06-26T00:00:00+00:00", "updated_at": "2026-06-26T00:00:00+00:00",
    })
    order_id = None
    try:
        async with httpx.AsyncClient(base_url=BASE, timeout=40) as c:
            assert (await c.post("/baraya/register", json=C)).status_code == 201
            token = (await c.post("/baraya/login", json={"email": C["email"], "password": C["password"]})).json()["access_token"]
            h = {"Authorization": f"Bearer {token}"}
            body = {
                "items": [{"product_id": PRODUCT_ID, "variant_id": None, "quantity": 2}],
                "customer": {"name": C["full_name"], "email": C["email"], "phone": C["phone"]},
                "shipping": {"recipient": C["full_name"], "address": "Jl Verifikasi 9", "city": "Bandung",
                             "province": "Jawa Barat", "postal_code": "40000"},
            }
            r = await c.post("/merchandise/checkout", json=body, headers=h)
            log("checkout as Baraya 201", r.status_code == 201, str(r.status_code))
            order = r.json()["order"]
            order_id = order["id"]
            log("order total computed server-side (2 x 150000)", order["total"] == 300000, str(order["total"]))
            log("order linked to customer_id", bool(order.get("customer_id")), str(order.get("customer_id")))
            log("payment status PENDING (no fake success)", order["payment_status"] == "PENDING")

            mine = await c.get("/baraya/orders", headers=h)
            log("order visible in riwayat pesanan", any(o["id"] == order_id for o in mine.json()["items"]))
            detail = await c.get(f"/baraya/orders/{order_id}", headers=h)
            log("order detail readable by owner", detail.status_code == 200 and "password" not in detail.text.lower())

            guest = await c.post("/merchandise/checkout", json=body)
            log("guest checkout still works (no regression)", guest.status_code == 201, str(guest.status_code))
            guest_order = guest.json()["order"]
            log("guest order has no customer_id", guest_order.get("customer_id") is None)
            await db.orders.delete_many({"id": guest_order["id"]})
    finally:
        doc = await db.customers.find_one({"email": C["email"]})
        if doc:
            await db.customer_sessions.delete_many({"customer_id": doc["id"]})
        await db.customers.delete_many({"email": C["email"]})
        await db.products.delete_many({"id": PRODUCT_ID})
        if order_id:
            await db.orders.delete_many({"id": order_id})
        left = (
            await db.customers.count_documents({"email": {"$regex": "barayaverify.dev"}})
            + await db.products.count_documents({"id": PRODUCT_ID})
            + await db.orders.count_documents({"customer.email": {"$regex": "barayaverify.dev"}})
        )
        log("throwaway data removed", left == 0, f"left={left}")
    sys.exit(0 if ok else 1)


asyncio.run(main())
