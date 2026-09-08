"""Fixture visual sementara untuk verifikasi UI Merchandise Fase 3.

Menulis HANYA ke database sekali-pakai `alsabbat_merch_p3_visual`
(bukan database staging). Dipakai untuk screenshot Admin Orders, lalu di-DROP.

  python3 /app/scripts/merch_phase3_visual_sandbox.py seed
  # ubah DB_NAME=alsabbat_merch_p3_visual di /app/backend/.env, restart backend
  python3 /app/scripts/merch_phase3_visual_sandbox.py drop
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")
VISUAL_DB = "alsabbat_merch_p3_visual"


def _iso(minutes_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat()


def _order(number, status, *, awb=None, timeline, created_min):
    return {
        "id": f"p3visual-{number}",
        "order_number": number,
        "customer_id": None,
        "customer": {"name": "Pembeli Uji Visual", "email": "visual.p3@sandbox-alsabbat.dev", "phone": "081200001111"},
        "shipping": {
            "recipient": "Pembeli Uji Visual",
            "address": "Jl. Pasirmuncang No. 12, RT 03 RW 05",
            "city": "Bandung",
            "province": "Jawa Barat",
            "postal_code": "40172",
            "notes": "Titip ke pos keamanan bila tidak ada orang.",
            "destination_id": "17594",
            "destination_label": "CICENDO, BANDUNG, JAWA BARAT, 40172",
            "courier_code": "jne",
            "courier_name": "JNE",
            "service_code": "REG",
            "service_name": "REG",
            "shipping_cost": 18000,
            "shipping_etd": "2-3 day",
            "shipment_weight_grams": 1200,
        },
        "items": [
            {
                "product_id": "p3visual-product",
                "variant_id": "p3visual-variant",
                "product_name": "Jersey Home 2026",
                "variant_name": "L",
                "quantity": 2,
                "unit_price": 285000,
                "subtotal": 570000,
                "currency": "IDR",
                "weight_grams": 600,
                "weight_source": "PRODUCT",
            }
        ],
        "subtotal": 570000,
        "shipping_cost": 18000,
        "total": 588000,
        "currency": "IDR",
        "order_status": status,
        "payment_status": "PAID" if status != "PENDING" else "PENDING",
        "payment_provider": "MIDTRANS",
        "payment_method": "bank_transfer" if status != "PENDING" else None,
        "payment_reference": "TRX-VISUAL-0001" if status != "PENDING" else None,
        "payment_redirect_url": None,
        "fulfilment": (
            {"courier_code": "jne", "service_code": "REG", "awb_number": awb, "updated_by": "admin@alsabbat.com", "updated_at": _iso(5)}
            if awb
            else {}
        ),
        "timeline": timeline,
        "created_at": _iso(created_min),
        "updated_at": _iso(1),
    }


async def seed():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[VISUAL_DB]
    await db.products.delete_many({})
    await db.orders.delete_many({})
    await db.products.insert_one(
        {
            "id": "p3visual-product",
            "name": "Jersey Home 2026",
            "slug": "jersey-home-2026",
            "status": "ACTIVE",
            "price": 285000,
            "stock_quantity": 12,
            "weight_grams": 600,
            "media_ids": [],
            "display_order": 0,
            "currency": "IDR",
            "created_at": _iso(600),
        }
    )
    base = [{"event": "ORDER_CREATED", "status": "PENDING", "from_status": None, "at": _iso(120), "actor": "GUEST", "actor_type": "CUSTOMER", "note": None}]
    paid = base + [
        {"event": "PAYMENT_STATUS_CHANGED", "status": "PENDING", "from_status": None, "at": _iso(110), "actor": "GATEWAY:MIDTRANS", "actor_type": "PAYMENT_GATEWAY", "note": "Pembayaran PAID"},
        {"event": "PROCESSING", "status": "PROCESSING", "from_status": "PENDING", "at": _iso(109), "actor": "GATEWAY:MIDTRANS", "actor_type": "PAYMENT_GATEWAY", "note": "Pembayaran terverifikasi"},
    ]
    packed = paid + [
        {"event": "PACKED", "status": "PACKED", "from_status": "PROCESSING", "at": _iso(60), "actor": "admin@alsabbat.com", "actor_type": "ADMIN", "note": "Dikemas rapi"},
    ]
    shipped = packed + [
        {"event": "SHIPPING_UPDATED", "status": "PACKED", "from_status": None, "at": _iso(40), "actor": "admin@alsabbat.com", "actor_type": "ADMIN", "note": "Resi JNE0099887766"},
        {"event": "READY_TO_SHIP", "status": "READY_TO_SHIP", "from_status": "PACKED", "at": _iso(30), "actor": "admin@alsabbat.com", "actor_type": "ADMIN", "note": None},
        {"event": "SHIPPED", "status": "SHIPPED", "from_status": "READY_TO_SHIP", "at": _iso(20), "actor": "admin@alsabbat.com", "actor_type": "ADMIN", "note": None},
    ]
    cod = _order("ALS-2026-000104", "SHIPPED", awb="JNE1234567890", timeline=shipped, created_min=30)
    cod.update({
        "id": "p3visual-cod",
        "payment_method_choice": "COD",
        "payment_provider": "COD",
        "payment_method": "COD",
        "payment_status": "PENDING",
        "cod_fee": 4000,
        "total": 592000,
        "stock_applied": True,
    })
    done = _order("ALS-2026-000105", "COMPLETED", awb="JNE5544332211", timeline=shipped, created_min=20)
    done.update({"id": "p3visual-done", "order_status": "COMPLETED", "stock_applied": True})
    await db.orders.insert_many(
        [
            _order("ALS-2026-000101", "PENDING", timeline=base, created_min=120),
            _order("ALS-2026-000102", "PACKED", timeline=packed, created_min=90),
            _order("ALS-2026-000103", "SHIPPED", awb="JNE0099887766", timeline=shipped, created_min=45),
            cod,
            done,
        ]
    )
    cust_id = "p3visual-customer"
    from app.core.security import hash_password  # noqa: PLC0415

    await db.customers.delete_many({"id": cust_id})
    await db.customers.insert_one(
        {
            "id": cust_id,
            "email": "visual.baraya@sandbox-alsabbat.dev",
            "full_name": "Baraya Uji Visual",
            "phone": "081200002222",
            "status": "ACTIVE",
            "role": "MEMBER",
            "email_verified": True,
            "auth_provider": "PASSWORD",
            "password_hash": hash_password("Sandbox123"),
            "created_at": _iso(400),
            "updated_at": _iso(400),
        }
    )
    cust_a = _order("ALS-2026-000106", "SHIPPED", awb="JNE7777000111", timeline=shipped, created_min=18)
    cust_a.update({"id": "p3visual-cust-a", "customer_id": cust_id, "stock_applied": True})
    cust_b = _order("ALS-2026-000107", "SHIPPED", awb="JNE7777000222", timeline=shipped, created_min=17)
    cust_b.update({"id": "p3visual-cust-b", "customer_id": cust_id, "stock_applied": True})
    await db.orders.insert_many([cust_a, cust_b])

    await db.refunds.delete_many({})
    await db.refunds.insert_one(
        {
            "id": "p3visual-refund",
            "order_id": "p3visual-cod",
            "order_number": "ALS-2026-000104",
            "customer_id": None,
            "customer_email": "visual.p3@sandbox-alsabbat.dev",
            "amount": 592000,
            "currency": "IDR",
            "method": "COD_MANUAL",
            "reason": "Barang rusak",
            "detail": "Kemasan penyok, jersey sobek di bahu kanan.",
            "evidence_urls": [],
            "bank_account": "BCA 1234567890",
            "status": "REQUESTED",
            "decision_note": None,
            "provider_reference": None,
            "transfer_reference": None,
            "timeline": [{"status": "REQUESTED", "at": _iso(15), "actor": "customer", "actor_type": "CUSTOMER", "note": "Barang rusak"}],
            "created_at": _iso(15),
            "updated_at": _iso(15),
        }
    )
    print("seeded", VISUAL_DB, "orders:", await db.orders.count_documents({}))


async def drop():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    await client.drop_database(VISUAL_DB)
    print("dropped", VISUAL_DB)


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "seed"
    asyncio.run(seed() if action == "seed" else drop())
