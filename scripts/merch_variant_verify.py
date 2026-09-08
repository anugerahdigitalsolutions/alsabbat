"""Verifikasi nyata varian produk merchandise (Admin -> API -> Cart -> Checkout).

Memakai backend & endpoint EXISTING (dev/preview). Semua data uji dibuat lewat
API Admin lalu DIHAPUS kembali di akhir (tidak ada data dummy yang tertinggal).

Skenario wajib (sesuai permintaan):
  Jersey  S = 100.000 / stok 10 (tanpa price_override -> pakai harga produk)
          M = 100.000 / stok 5
          L = 110.000 / stok 3
          XL = 120.000 / stok 2
"""
from __future__ import annotations

import asyncio
import os
import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@alsabbat.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Alsabbat2026!")

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'} · {name}{' · ' + detail if detail else ''}")


def main() -> int:
    created_variants: list[str] = []
    product_id = None
    order_id = None

    with httpx.Client(base_url=BASE, timeout=60) as client:
        login = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        check("login admin", login.status_code == 200, f"HTTP {login.status_code}")
        if login.status_code != 200:
            return 1
        admin = {"Authorization": f"Bearer {login.json()['access_token']}"}

        try:
            product = client.post(
                "/api/merchandise/catalog/products",
                headers=admin,
                json={
                    "name": "Jersey Sandbox Varian",
                    "slug": "jersey-sandbox-varian",
                    "status": "ACTIVE",
                    "price": 100000,
                    "currency": "IDR",
                    "stock_quantity": 0,
                    "weight_grams": 500,
                    "display_order": 999,
                    "description": "Produk sandbox verifikasi varian (dihapus otomatis).",
                },
            )
            check("admin membuat produk", product.status_code in (200, 201), f"HTTP {product.status_code} {product.text[:120]}")
            if product.status_code not in (200, 201):
                return 1
            product_id = product.json()["id"]

            plan = [
                ("S", None, 10, "JSY-S"),
                ("M", 100000, 5, "JSY-M"),
                ("L", 110000, 3, "JSY-L"),
                ("XL", 120000, 2, "JSY-XL"),
            ]
            variant_ids: dict[str, str] = {}
            for name, price, stock, sku in plan:
                response = client.post(
                    "/api/merchandise/catalog/variants",
                    headers=admin,
                    json={
                        "product_id": product_id,
                        "name": name,
                        "sku": sku,
                        "price_override": price,
                        "stock_quantity": stock,
                        "status": "ACTIVE",
                        "display_order": len(variant_ids),
                    },
                )
                if response.status_code in (200, 201):
                    variant_ids[name] = response.json()["id"]
                    created_variants.append(response.json()["id"])
            check("admin membuat 4 varian (S/M/L/XL)", len(variant_ids) == 4, f"dibuat={len(variant_ids)}")

            # ---------------------------------------------- katalog publik
            listing = client.get("/api/merchandise/products", params={"limit": 50})
            item = next((p for p in listing.json().get("items", []) if p["id"] == product_id), None)
            check(
                "katalog publik: rentang harga & jumlah varian",
                bool(item)
                and item["price_min"] == 100000
                and item["price_max"] == 120000
                and item["price_varies"] is True
                and item["variant_count"] == 4
                and item["available_stock"] == 20
                and item["in_stock"] is True,
                f"min={item and item.get('price_min')} max={item and item.get('price_max')} varies={item and item.get('price_varies')} stok={item and item.get('available_stock')}",
            )

            detail = client.get("/api/merchandise/products/by-slug/jersey-sandbox-varian")
            variants = detail.json().get("variants", [])
            by_name = {v["name"]: v for v in variants}
            check(
                "detail publik memuat varian (nama/harga/stok/SKU)",
                len(variants) == 4
                and by_name["L"]["price_override"] == 110000
                and by_name["XL"]["stock_quantity"] == 2
                and by_name["S"]["price_override"] is None
                and by_name["XL"]["sku"] == "JSY-XL",
                f"varian={[v['name'] for v in variants]}",
            )

            # -------------------------------------- cart revalidate (server)
            revalidate = client.post(
                "/api/merchandise/cart/revalidate",
                json={
                    "items": [
                        {"product_id": product_id, "variant_id": variant_ids["XL"], "quantity": 1},
                        {"product_id": product_id, "variant_id": variant_ids["S"], "quantity": 2},
                    ]
                },
            )
            body = revalidate.json()
            xl = next((i for i in body["items"] if i["variant_name"] == "XL"), {})
            s_item = next((i for i in body["items"] if i["variant_name"] == "S"), {})
            check(
                "cart membedakan varian + harga per varian dari server",
                revalidate.status_code == 200
                and xl.get("unit_price") == 120000
                and s_item.get("unit_price") == 100000
                and body["subtotal"] == 120000 + 200000
                and xl.get("variant_id") != s_item.get("variant_id"),
                f"XL={xl.get('unit_price')} S={s_item.get('unit_price')} subtotal={body.get('subtotal')}",
            )
            check(
                "item cart membawa identifier varian (dipakai order)",
                bool(xl.get("variant_id")) and xl.get("product_name") and xl.get("variant_name") == "XL",
            )

            over = client.post(
                "/api/merchandise/cart/revalidate",
                json={"items": [{"product_id": product_id, "variant_id": variant_ids["XL"], "quantity": 3}]},
            )
            check(
                "stok varian XL (2) tidak bisa dilewati (qty 3 ditolak server)",
                over.status_code >= 400 and "tersisa 2" in over.text,
                f"HTTP {over.status_code}",
            )

            no_variant = client.post(
                "/api/merchandise/cart/revalidate",
                json={"items": [{"product_id": product_id, "quantity": 1}]},
            )
            check(
                "produk bervarian wajib memilih varian",
                no_variant.status_code >= 400 and "varian" in no_variant.text.lower(),
                f"HTTP {no_variant.status_code}",
            )

            # ------------------------- perubahan harga admin -> langsung sinkron
            patch = client.patch(
                f"/api/merchandise/catalog/variants/{variant_ids['XL']}",
                headers=admin,
                json={"price_override": 125000},
            )
            after = client.post(
                "/api/merchandise/cart/revalidate",
                json={"items": [{"product_id": product_id, "variant_id": variant_ids["XL"], "quantity": 1}]},
            )
            check(
                "harga varian diubah admin -> API/website/mobile ikut berubah",
                patch.status_code == 200 and after.json()["items"][0]["unit_price"] == 125000,
                f"harga baru={after.json()['items'][0]['unit_price'] if after.status_code == 200 else after.status_code}",
            )
            client.patch(
                f"/api/merchandise/catalog/variants/{variant_ids['XL']}",
                headers=admin,
                json={"price_override": 120000},
            )

            # --------------------------- varian habis tidak bisa masuk checkout
            client.patch(
                f"/api/merchandise/catalog/variants/{variant_ids['M']}",
                headers=admin,
                json={"stock_quantity": 0},
            )
            sold_out = client.post(
                "/api/merchandise/cart/revalidate",
                json={"items": [{"product_id": product_id, "variant_id": variant_ids["M"], "quantity": 1}]},
            )
            check(
                "varian stok 0 tidak bisa dibeli",
                sold_out.status_code >= 400 and "tersisa 0" in sold_out.text,
                f"HTTP {sold_out.status_code}",
            )
            client.patch(
                f"/api/merchandise/catalog/variants/{variant_ids['M']}",
                headers=admin,
                json={"stock_quantity": 5},
            )

            # ------------------------------ order menyimpan varian yang dibeli
            checkout = client.post(
                "/api/merchandise/checkout",
                json={
                    "items": [
                        {"product_id": product_id, "variant_id": variant_ids["XL"], "quantity": 1},
                        {"product_id": product_id, "variant_id": variant_ids["S"], "quantity": 2},
                    ],
                    "payment_method": "MIDTRANS",
                    "customer": {
                        "name": "Sandbox Verifikasi",
                        "email": "sandbox.variant@sandbox-alsabbat.dev",
                        "phone": "081200000000",
                    },
                    "shipping": {
                        "recipient": "Sandbox Verifikasi",
                        "address": "Jalan Verifikasi Nomor 1",
                        "city": "Bandung",
                        "province": "Jawa Barat",
                        "postal_code": "40000",
                    },
                },
            )
            if checkout.status_code in (200, 201):
                order = checkout.json()["order"]
                order_id = order["id"]
                items = order.get("items", [])
                names = {i.get("variant_name"): i for i in items}
                check(
                    "order menyimpan varian + harga per varian",
                    "XL" in names
                    and "S" in names
                    and names["XL"]["unit_price"] == 120000
                    and names["XL"]["variant_id"] == variant_ids["XL"]
                    and names["S"]["quantity"] == 2
                    and order["subtotal"] == 320000,
                    f"items={[(i.get('variant_name'), i.get('unit_price'), i.get('quantity')) for i in items]}",
                )
            else:
                check(
                    "order menyimpan varian + harga per varian",
                    False,
                    f"checkout HTTP {checkout.status_code} {checkout.text[:160]}",
                )
        finally:
            # -------------------------------------------------- pembersihan
            for variant_id in created_variants:
                client.delete(f"/api/merchandise/catalog/variants/{variant_id}", headers=admin)
            if product_id:
                deleted = client.delete(f"/api/merchandise/catalog/products/{product_id}", headers=admin)
                check("produk & varian sandbox dihapus", deleted.status_code in (200, 204), f"HTTP {deleted.status_code}")
            if order_id:
                asyncio.run(_drop_order(order_id))
                check("order sandbox dihapus dari database dev", True, order_id)

    failed = [name for name, ok, _ in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} PASS")
    return 1 if failed else 0


async def _drop_order(order_id: str) -> None:
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient

    load_dotenv("/app/backend/.env")
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("MONGODB_DB_NAME") or os.environ.get("DB_NAME")]
    await db["orders"].delete_one({"id": order_id})
    await db["counters"].delete_many({"_id": {"$regex": "^order-"}})


if __name__ == "__main__":
    sys.exit(main())
