"""Merchandise & Commerce API (Phase 9) — additive module.

Public   : products, product detail, categories, cart revalidation
Admin    : product / category / variant CRUD, stock, orders, fulfilment
Payments : provider status, official gateway session, verified webhook

Prices and stock are ALWAYS resolved server-side; the client total is ignored.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from pymongo.errors import DuplicateKeyError

from app.api.crud_factory import Repository, build_crud_router
from app.api.deps import optional_customer, require_permission
from app.models.customer import CustomerAuthContext
from app.core.database import Collections, get_db
from app.models.base import new_id
from app.core.errors import NotFoundError, ValidationFailedError
from app.core.logging_config import get_logger
from app.core.rate_limit import checkout_guard, public_rate_limit, webhook_guard, write_rate_limit
from app.models.auth import AuthContext
from app.models.commerce import (
    CheckoutRequest,
    RefundManualTransfer,
    RefundReview,
    OrderFulfilmentUpdate,
    OrderStatusUpdate,
    ProductBase,
    ProductCategoryBase,
    ProductCategoryUpdate,
    ProductUpdate,
    ProductVariantBase,
    ProductVariantUpdate,
    ShippingQuoteRequest,
)
from app.services.payments import active_provider, provider_status
from app.services.media_service import resolve_media_refs
from app.services import commerce_stock
from app.services import order_fulfilment as fulfilment
from app.services import refunds as refund_service
from app.services import shipping_rajaongkir as shipping

logger = get_logger(__name__)

router = APIRouter(tags=["merchandise"])
products = Repository(Collections.PRODUCTS)
categories = Repository(Collections.PRODUCT_CATEGORIES)
variants = Repository(Collections.PRODUCT_VARIANTS)
orders = Repository(Collections.ORDERS)
media = Repository(Collections.MEDIA)

order_read = Depends(require_permission("order:read"))
order_write = Depends(require_permission("order:write"))
SHIPPING_FLAT = 0  # real shipping tariffs are configured by the club, not invented here


# ------------------------------------------------------------------ helpers
async def _resolve_media(ids: List[str]) -> List[Dict[str, Any]]:
    """Resolve galeri produk (foto + video, urutan dipertahankan).

    `media_ids` menerima id Media Library ATAU URL media (konvensi galeri yang
    sudah dipakai komponen galeri admin existing). Tipe media diambil dari
    metadata Media Library (`file_type`/MIME); ekstensi URL hanya cadangan.
    """
    items: List[Dict[str, Any]] = []
    for entry in await resolve_media_refs(ids):
        if not entry.get("url"):
            continue
        items.append(
            {
                "id": entry.get("id"),
                "url": entry.get("url"),
                "alt_text": entry.get("alt_text"),
                # Default IMAGE agar entri lama/tak dikenal tampil seperti sebelumnya.
                "file_type": entry.get("file_type") or "IMAGE",
                "mime_type": entry.get("mime_type"),
                "thumbnail_url": entry.get("thumbnail_url"),
            }
        )
    return items


async def _enrich_product(product: Dict[str, Any], with_variants: bool = False) -> Dict[str, Any]:
    cover = await media.get(product["cover_media_id"]) if product.get("cover_media_id") else None
    category = await categories.get(product["category_id"]) if product.get("category_id") else None
    variant_items, _ = await variants.list(
        {"product_id": product["id"], "status": "ACTIVE"}, limit=50, sort=(("display_order", 1),)
    )
    available = sum(int(v.get("stock_quantity") or 0) for v in variant_items) if variant_items else int(
        product.get("stock_quantity") or 0
    )
    # Rentang harga efektif (aditif, tanpa perubahan skema): dipakai katalog
    # Website/Mobile agar produk bervarian tidak menampilkan satu harga yang
    # menyesatkan ("Mulai dari ..."). Harga tetap dihitung ulang server saat
    # revalidate/checkout.
    base_price = int(product.get("price") or 0)
    variant_prices = [
        int(v.get("price_override")) if v.get("price_override") is not None else base_price
        for v in variant_items
    ] or [base_price]
    enriched = {
        **product,
        "cover_url": (cover or {}).get("url"),
        "category": {"id": category["id"], "name": category.get("name"), "slug": category.get("slug")}
        if category
        else None,
        "variant_count": len(variant_items),
        "available_stock": available,
        "in_stock": available > 0,
        "price_min": min(variant_prices),
        "price_max": max(variant_prices),
        "price_varies": min(variant_prices) != max(variant_prices),
    }
    if with_variants:
        enriched["variants"] = variant_items
        enriched["gallery"] = await _resolve_media(product.get("media_ids") or [])
    return enriched


async def _price_and_stock(item: Dict[str, Any]) -> Dict[str, Any]:
    """Server-side authority for existence, price and stock."""
    product = await products.get(item["product_id"])
    if not product or product.get("status") != "ACTIVE":
        raise ValidationFailedError("Produk tidak tersedia.")
    variant = None
    if item.get("variant_id"):
        variant = await variants.get(item["variant_id"])
        if not variant or variant.get("product_id") != product["id"] or variant.get("status") != "ACTIVE":
            raise ValidationFailedError("Varian produk tidak tersedia.")
    else:
        active_variants, _ = await variants.list({"product_id": product["id"], "status": "ACTIVE"}, limit=1)
        if active_variants:
            raise ValidationFailedError(f"Pilih varian untuk produk {product['name']}.")

    unit_price = int((variant or {}).get("price_override") or product.get("price") or 0)
    stock = int((variant or product).get("stock_quantity") or 0)
    quantity = int(item["quantity"])
    if quantity > stock:
        raise ValidationFailedError(
            f"Stok {product['name']}{' - ' + variant['name'] if variant else ''} tersisa {stock}."
        )
    # Berat kirim efektif (Fase 2): berat varian menang bila valid, jika tidak
    # memakai berat produk. Tidak pernah diberi nilai default palsu.
    variant_weight = (variant or {}).get("weight_grams")
    product_weight = product.get("weight_grams")
    weight_grams: Optional[int] = None
    weight_source: Optional[str] = None
    if isinstance(variant_weight, (int, float)) and variant_weight > 0:
        weight_grams, weight_source = int(variant_weight), "VARIANT"
    elif isinstance(product_weight, (int, float)) and product_weight > 0:
        weight_grams, weight_source = int(product_weight), "PRODUCT"
    return {
        "product_id": product["id"],
        "variant_id": (variant or {}).get("id"),
        "product_name": product["name"],
        "variant_name": (variant or {}).get("name"),
        "quantity": quantity,
        "unit_price": unit_price,
        "subtotal": unit_price * quantity,
        "currency": product.get("currency") or "IDR",
        "weight_grams": weight_grams,
        "weight_source": weight_source,
    }


def _shipment_weight(items: List[Dict[str, Any]]) -> int:
    """Total berat kiriman (gram) = Σ (jumlah × berat efektif item).

    Bila ada item tanpa berat, ongkir TIDAK dihitung dengan angka karangan —
    checkout mengembalikan galat yang jelas.
    """
    missing = [item["product_name"] for item in items if not item.get("weight_grams")]
    if missing:
        raise ValidationFailedError(
            "Berat kirim belum diatur untuk: "
            + ", ".join(sorted(set(missing)))
            + ". Ongkir belum bisa dihitung — hubungi admin toko."
        )
    return sum(int(item["weight_grams"]) * int(item["quantity"]) for item in items)


async def _next_order_number() -> str:
    db = get_db()
    year = datetime.now(timezone.utc).year
    counter = await db["counters"].find_one_and_update(
        {"_id": f"order-{year}"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True
    )
    return f"ALS-{year}-{int(counter['seq']):06d}"


def _public_order(order: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in order.items()
        if key not in {"payment_raw", "payment_provider_payload"}
    }


def _admin_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """Order untuk Admin Panel — snapshot utuh + lifecycle Fase 3."""
    payload = _public_order(order)
    payload["shipment"] = fulfilment.effective_shipment(order)
    payload["timeline"] = fulfilment.read_timeline(order)
    payload["allowed_transitions"] = fulfilment.allowed_transitions(
        order, payment_configured=active_provider().is_configured()
    )
    payload["item_count"] = sum(int(i.get("quantity") or 0) for i in (order.get("items") or []))
    return payload


async def _admin_order_full(order: Dict[str, Any]) -> Dict[str, Any]:
    payload = _admin_order(order)
    refund = await refund_service.latest_for_order(order["id"])
    payload["refund"] = refund_service.public_refund(refund) if refund else None
    return payload


def _customer_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """Order untuk pelanggan — tanpa identitas admin & catatan internal."""
    payload = _public_order(order)
    payload["shipment"] = fulfilment.effective_shipment(order)
    payload["timeline"] = fulfilment.customer_timeline(order)
    payload.pop("fulfilment", None)
    return payload


# ----------------------------------------------------- payment reconciliation
TERMINAL_PAYMENT_STATUS = {"PAID", "FAILED", "EXPIRED", "REFUNDED"}
# Batas waktu pembayaran gateway (jam). Diberlakukan di SERVER, bukan timer frontend.
PAYMENT_EXPIRY_HOURS = 24


async def _expire_if_due(order: Dict[str, Any]) -> Dict[str, Any]:
    """Kedaluwarsa pembayaran diberlakukan server-side (idempoten).

    Order COD tidak pernah kedaluwarsa (dibayar saat barang diterima).
    """
    if order.get("payment_status") != "PENDING" or order.get("order_status") != "PENDING":
        return order
    if str(order.get("payment_method_choice") or "MIDTRANS") == "COD":
        return order
    expires_at = order.get("payment_expires_at")
    if not expires_at:
        return order
    try:
        due = datetime.fromisoformat(str(expires_at))
    except ValueError:
        return order
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    if due > datetime.now(timezone.utc):
        return order
    now = datetime.now(timezone.utc).isoformat()
    result = await orders.coll.update_one(
        {"id": order["id"], "payment_status": "PENDING", "order_status": "PENDING"},
        {
            "$set": {
                "payment_status": "EXPIRED",
                "order_status": "CANCELLED",
                "cancelled_at": now,
                "expired_at": now,
            },
            "$push": {
                "timeline": {
                    "$each": [
                        fulfilment.timeline_entry(
                            event="PAYMENT_EXPIRED",
                            status="PENDING",
                            actor="SYSTEM",
                            note="Batas waktu pembayaran terlampaui.",
                        ),
                        fulfilment.timeline_entry(
                            event="CANCELLED",
                            status="CANCELLED",
                            from_status="PENDING",
                            actor="SYSTEM",
                            note="Pesanan dibatalkan otomatis karena pembayaran kedaluwarsa.",
                        ),
                    ]
                }
            },
        },
    )
    if not result.modified_count:
        return await orders.get(order["id"]) or order
    fresh = await orders.get(order["id"]) or order
    await commerce_stock.restock(fresh, actor="SYSTEM", reason="Pembayaran kedaluwarsa")
    logger.info("commerce.payment.expired order=%s", order.get("order_number"))
    return await orders.get(order["id"]) or fresh


async def _apply_payment_status(order: Dict[str, Any], payload: Dict[str, Any]) -> str:
    """Idempotently apply a provider-verified payment payload to an order."""
    provider = active_provider()
    try:
        notified = int(float(payload.get("gross_amount")))
    except (TypeError, ValueError):
        raise ValidationFailedError("Nominal notifikasi tidak valid.")
    if notified != int(order["total"]):
        raise ValidationFailedError("Nominal notifikasi tidak sesuai dengan order.")
    if order.get("payment_status") in TERMINAL_PAYMENT_STATUS:
        return str(order["payment_status"])

    new_status = provider.map_status(payload)
    update = {
        "payment_status": new_status,
        "payment_reference": str(payload.get("transaction_id") or order.get("payment_reference") or ""),
        "payment_method": payload.get("payment_type"),
    }
    if new_status == "PAID":
        update["order_status"] = "PROCESSING"
        update["paid_at"] = datetime.now(timezone.utc).isoformat()

    result = await orders.coll.update_one(
        {"id": order["id"], "payment_status": {"$nin": list(TERMINAL_PAYMENT_STATUS)}},
        {"$set": update},
    )
    if result.modified_count:
        # Timeline (Fase 3) — hanya ditambahkan, tidak pernah menimpa histori.
        events = [
            fulfilment.timeline_entry(
                event="PAYMENT_STATUS_CHANGED",
                status=order.get("order_status"),
                actor=f"GATEWAY:{provider.name}",
                actor_type="PAYMENT_GATEWAY",
                note=f"Pembayaran {new_status}",
            )
        ]
        if update.get("order_status"):
            events.append(
                fulfilment.timeline_entry(
                    event=update["order_status"],
                    status=update["order_status"],
                    from_status=order.get("order_status"),
                    actor=f"GATEWAY:{provider.name}",
                    actor_type="PAYMENT_GATEWAY",
                    note="Pembayaran terverifikasi",
                )
            )
        await orders.coll.update_one(
            {"id": order["id"]}, {"$push": {"timeline": {"$each": events}}}
        )
        if update.get("order_status"):
            await fulfilment.notify_customer_status({**order, **update}, update["order_status"])
    if result.modified_count and new_status == "PAID":
        # Stok dikurangi tepat sekali, atomik, setelah pembayaran terverifikasi.
        await commerce_stock.apply_stock(
            await orders.get(order["id"]) or order,
            actor=f"GATEWAY:{provider.name}",
            reason="Pembayaran terverifikasi",
        )
    if result.modified_count and new_status in {"FAILED", "EXPIRED"}:
        fresh = await orders.get(order["id"]) or order
        await commerce_stock.restock(fresh, actor=f"GATEWAY:{provider.name}", reason=f"Pembayaran {new_status}")
    logger.info("commerce.payment.%s order=%s", new_status, order["order_number"])
    return new_status


async def _reconcile_payment(order: Dict[str, Any]) -> Dict[str, Any]:
    """Pull the authoritative status from the gateway when still pending.

    Guards against a lost webhook; a frontend redirect alone is never trusted.
    """
    order = await _expire_if_due(order)
    if order.get("payment_status") in TERMINAL_PAYMENT_STATUS:
        return order
    provider = active_provider()
    if not provider.is_configured():
        return order
    payload = await provider.fetch_status(order["order_number"])
    if not payload:
        return order
    await _apply_payment_status(order, payload)
    return await orders.get(order["id"]) or order


# ------------------------------------------------------------------ public
@router.get("/products", summary="Public product list")
async def list_products(
    request: Request,
    category_id: Optional[str] = None,
    limit: int = Query(default=24, ge=1, le=60),
    skip: int = Query(default=0, ge=0),
) -> Dict[str, Any]:
    public_rate_limit(request)
    query: Dict[str, Any] = {"status": "ACTIVE"}
    if category_id:
        query["category_id"] = category_id
    items, total = await products.list(query, limit=limit, skip=skip, sort=(("display_order", 1), ("created_at", -1)))
    return {
        "items": [await _enrich_product(item) for item in items],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.get("/categories/public", summary="Public product categories")
async def public_categories(request: Request) -> Dict[str, Any]:
    public_rate_limit(request)
    items, total = await categories.list({"status": "ACTIVE"}, limit=50, sort=(("display_order", 1),))
    return {"items": items, "total": total}


@router.get("/products/by-slug/{slug}", summary="Public product detail")
async def product_by_slug(slug: str, request: Request) -> Dict[str, Any]:
    public_rate_limit(request)
    product = await products.get_by({"slug": slug, "status": "ACTIVE"})
    if not product:
        # Backwards compatibility: products created before slugs were generated
        # reliably have slug=None, so the storefront links with the id instead.
        # Accepting the id here keeps those existing products reachable without
        # rewriting any stored document.
        product = await products.get_by({"id": slug, "status": "ACTIVE"})
    if not product:
        raise NotFoundError("Product not found")
    return await _enrich_product(product, with_variants=True)


@router.post("/cart/revalidate", summary="Server-side cart revalidation (price + stock)")
async def revalidate_cart(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    public_rate_limit(request)
    raw_items = payload.get("items") or []
    if not isinstance(raw_items, list) or not raw_items:
        return {"items": [], "subtotal": 0, "shipping_cost": SHIPPING_FLAT, "total": SHIPPING_FLAT}
    resolved = [await _price_and_stock(item) for item in raw_items[:30]]
    subtotal = sum(item["subtotal"] for item in resolved)
    return {
        "items": resolved,
        "subtotal": subtotal,
        "shipping_cost": SHIPPING_FLAT,
        "total": subtotal + SHIPPING_FLAT,
        "currency": "IDR",
    }


# ---------------------------------------------------------------- shipping
@router.get("/shipping/config", summary="Status konfigurasi ongkir (tanpa rahasia)")
async def shipping_configuration() -> Dict[str, Any]:
    """Hanya status; API key RajaOngkir TIDAK pernah dikirim ke frontend."""
    return shipping.status()


@router.get("/cod/status", summary="Status ketersediaan COD (tanpa rahasia)")
async def cod_configuration() -> Dict[str, Any]:
    return shipping.cod_status()


@router.get("/shipping/destinations", summary="Cari tujuan pengiriman (proxy server-side)")
async def shipping_destinations(
    request: Request,
    search: str = Query(..., min_length=3, max_length=80),
    limit: int = Query(20, ge=1, le=50),
) -> Dict[str, Any]:
    public_rate_limit(request)
    items = await shipping.search_destinations(search, limit=limit)
    return {"items": items, "total": len(items)}


@router.post("/shipping/quote", summary="Hitung ongkir real-time (server-side authority)")
async def shipping_quote(
    payload: ShippingQuoteRequest,
    request: Request,
    _customer: Optional[CustomerAuthContext] = Depends(optional_customer),
) -> Dict[str, Any]:
    """Harga & berat dihitung ulang di server; input klien hanya referensi."""
    write_rate_limit(request)
    items = [await _price_and_stock(item.model_dump()) for item in payload.items]
    subtotal = sum(item["subtotal"] for item in items)
    weight_grams = _shipment_weight(items)
    options = await shipping.calculate_cost(payload.destination_id, weight_grams, payload.couriers)
    return {
        "destination_id": str(payload.destination_id),
        "shipment_weight_grams": weight_grams,
        "subtotal": subtotal,
        "currency": "IDR",
        "options": options,
    }


@router.get("/payment/status", summary="Payment gateway configuration state (secret-free)")
async def payment_configuration() -> Dict[str, Any]:
    return provider_status()


# ---------------------------------------------------------------- checkout
@router.post("/checkout", status_code=201, summary="Create order + payment session")
async def checkout(
    payload: CheckoutRequest,
    request: Request,
    customer: Optional[CustomerAuthContext] = Depends(optional_customer),
) -> Dict[str, Any]:
    await checkout_guard(request)
    items = [await _price_and_stock(item.model_dump()) for item in payload.items]
    subtotal = sum(item["subtotal"] for item in items)

    # --- Otoritas ongkir (Fase 2) ---------------------------------------
    # Biaya kirim SELALU dihitung ulang di server dari kombinasi
    # origin + destination + berat + layanan terpilih. Nilai dari frontend
    # hanya dipakai untuk mendeteksi perubahan harga.
    shipping_data = payload.shipping.model_dump()
    shipping_cost = SHIPPING_FLAT
    cod_fee = 0
    method = payload.payment_method.value
    shipment_weight_grams: Optional[int] = None
    selection = (
        shipping_data.get("destination_id"),
        shipping_data.get("courier_code"),
        shipping_data.get("service_code"),
    )
    if all(selection):
        shipment_weight_grams = _shipment_weight(items)
        option = await shipping.find_option(
            destination_id=selection[0],
            weight_grams=shipment_weight_grams,
            courier_code=selection[1],
            service_code=selection[2],
        )
        if method == "COD":
            # COD hanya boleh dipakai bila layanan terpilih memang mendukungnya
            # menurut penyedia ongkir (tanpa kurir/biaya karangan).
            if not option.get("cod_available"):
                raise ValidationFailedError(
                    option.get("cod_note")
                    or "Layanan pengiriman yang dipilih tidak mendukung COD. Pilih layanan lain."
                )
            cod_fee = shipping.cod_fee_for(option, subtotal)
        client_cost = shipping_data.get("shipping_cost")
        if client_cost is not None and int(client_cost) != option["cost"]:
            raise ValidationFailedError(
                "Biaya kirim berubah sejak Anda memilih layanan. Muat ulang halaman checkout "
                "dan hitung ongkir kembali sebelum melanjutkan pembayaran."
            )
        shipping_cost = option["cost"]
        shipping_data.update(
            {
                "courier_code": option["courier_code"],
                "courier_name": option["courier_name"],
                "service_code": option["service_code"],
                "service_name": option["service_name"],
                "shipping_cost": option["cost"],
                "shipping_etd": option["etd"],
                "shipment_weight_grams": shipment_weight_grams,
            }
        )
    elif shipping.is_configured():
        # Ongkir aktif: pelanggan wajib memilih tujuan + layanan pengiriman.
        raise ValidationFailedError(
            "Pilih tujuan pengiriman dan layanan kurir terlebih dahulu untuk menghitung ongkir."
        )
    elif method == "COD":
        raise ValidationFailedError(
            "COD membutuhkan tujuan pengiriman dan layanan kurir yang mendukung COD."
        )
    else:
        # Kompatibilitas: bila ongkir belum dikonfigurasi, perilaku lama dipakai.
        shipping_data["shipping_cost"] = SHIPPING_FLAT

    order_number = await _next_order_number()
    order = await orders.create(
        {
            "order_number": order_number,
            "customer_id": customer.customer_id if customer else None,
            "customer": payload.customer.model_dump(),
            "shipping": shipping_data,
            "items": items,
            "subtotal": subtotal,
            "shipping_cost": shipping_cost,
            "cod_fee": cod_fee,
            "shipment_weight_grams": shipment_weight_grams,
            "total": subtotal + shipping_cost + cod_fee,
            "currency": "IDR",
            "order_status": "PENDING",
            "payment_status": "PENDING",
            "payment_method_choice": method,
            "payment_provider": "COD" if method == "COD" else active_provider().name,
            "payment_reference": None,
            "payment_redirect_url": None,
            # Fase 3 — riwayat pesanan (immutable, hanya ditambah).
            "timeline": [
                fulfilment.timeline_entry(
                    event="ORDER_CREATED",
                    status="PENDING",
                    actor=(customer.customer_id if customer else "GUEST"),
                    actor_type="CUSTOMER",
                )
            ],
            "fulfilment": {},
        }
    )

    if method == "COD":
        # COD tidak lewat gateway: stok dikunci sekarang secara atomik. Bila ada
        # item yang kehabisan stok, pengurangan yang sudah terjadi dibatalkan
        # penuh (rollback) dan pesanan tidak pernah dianggap sah.
        shortfall = await commerce_stock.reserve(order, actor="CHECKOUT", reason="Pesanan COD dibuat")
        if shortfall:
            await orders.coll.update_one(
                {"id": order["id"]},
                {"$set": {"order_status": "CANCELLED", "payment_status": "FAILED"}},
            )
            raise ValidationFailedError(
                "Stok tidak lagi mencukupi untuk: " + ", ".join(sorted(set(shortfall)))
            )
        await orders.coll.update_one(
            {"id": order["id"]},
            {"$set": {"payment_method": "COD", "payment_reference": None}},
        )
        fresh = await orders.get(order["id"]) or order
        logger.info("commerce.order.created order=%s method=COD", order_number)
        return {
            "order": _public_order(fresh),
            "payment": {
                "configured": True,
                "provider": "COD",
                "redirect_url": None,
                "token": None,
                "error_code": None,
                "error_message": None,
                "cod": True,
                "cod_fee": cod_fee,
            },
        }

    session = await active_provider().create_session(order)
    update: Dict[str, Any] = {
        "payment_reference": session.reference,
        "payment_redirect_url": session.redirect_url,
        "payment_expires_at": (
            datetime.now(timezone.utc) + timedelta(hours=PAYMENT_EXPIRY_HOURS)
        ).isoformat(),
    }
    if not session.configured or session.error_code:
        update["payment_error"] = session.error_message
    await orders.coll.update_one({"id": order["id"]}, {"$set": update})
    logger.info("commerce.order.created order=%s configured=%s", order_number, session.configured)
    return {
        "order": _public_order({**order, **update}),
        "payment": {
            "configured": session.configured,
            "provider": session.provider,
            "redirect_url": session.redirect_url,
            "token": session.token,
            "error_code": session.error_code,
            "error_message": session.error_message,
        },
    }


@router.get("/orders/track", summary="Guest order tracking (order number + email)")
async def track_order(order_number: str, email: str, request: Request) -> Dict[str, Any]:
    public_rate_limit(request)
    order = await orders.get_by({"order_number": order_number, "customer.email": email})
    if not order:
        raise NotFoundError("Order tidak ditemukan. Periksa nomor order dan email.")
    return _customer_order(await _reconcile_payment(order))


# ----------------------------------------------------------------- webhook
async def _log_webhook(payload: Dict[str, Any], *, signature_valid: bool) -> Optional[str]:
    """Catat notifikasi webhook untuk audit + dedup. TIDAK pernah menyimpan secret."""
    order_number = str(payload.get("order_id") or "")
    event_key = "|".join(
        [
            order_number,
            str(payload.get("transaction_id") or ""),
            str(payload.get("status_code") or ""),
            str(payload.get("transaction_status") or ""),
        ]
    )
    if not signature_valid:
        # Notifikasi tak tervalidasi tidak boleh "mengunci" event yang sah,
        # jadi dicatat sebagai baris audit tersendiri.
        event_key = f"{event_key}|INVALID:{new_id()}"
    doc = {
        "id": new_id(),
        "event_key": event_key,
        "provider": active_provider().name,
        "order_number": order_number,
        "transaction_id": str(payload.get("transaction_id") or "") or None,
        "transaction_status": str(payload.get("transaction_status") or "") or None,
        "status_code": str(payload.get("status_code") or "") or None,
        "gross_amount": str(payload.get("gross_amount") or "") or None,
        "signature_valid": signature_valid,
        "processing_status": "RECEIVED",
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await get_db()[Collections.PAYMENT_WEBHOOK_LOGS].insert_one(doc)
    except DuplicateKeyError:
        return None
    return doc["id"]


async def _close_webhook_log(log_id: Optional[str], *, status: str, result: Optional[str] = None, error: Optional[str] = None) -> None:
    if not log_id:
        return
    await get_db()[Collections.PAYMENT_WEBHOOK_LOGS].update_one(
        {"id": log_id},
        {"$set": {"processing_status": status, "result": result, "error": error, "processed_at": datetime.now(timezone.utc).isoformat()}},
    )


@router.post("/payment/webhook", summary="Payment gateway notification (verified)")
async def payment_webhook(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    await webhook_guard(request)
    provider = active_provider()
    signature_valid = provider.verify_notification(payload)
    log_id = await _log_webhook(payload, signature_valid=signature_valid)
    if log_id is None:
        # Notifikasi identik yang sudah pernah diterima → tidak diproses ulang.
        logger.info("commerce.webhook.duplicate order=%s", payload.get("order_id"))
        return {"ok": True, "duplicate": True}
    if not signature_valid:
        await _close_webhook_log(log_id, status="REJECTED", error="INVALID_SIGNATURE")
        raise ValidationFailedError("Signature notifikasi pembayaran tidak valid.")

    order = await orders.get_by({"order_number": str(payload.get("order_id"))})
    if not order:
        await _close_webhook_log(log_id, status="FAILED", error="ORDER_NOT_FOUND")
        raise NotFoundError("Order tidak ditemukan")
    if order.get("payment_status") in TERMINAL_PAYMENT_STATUS:
        await _close_webhook_log(log_id, status="SKIPPED", result=str(order.get("payment_status")))
        return {"ok": True, "duplicate": True}
    try:
        new_status = await _apply_payment_status(order, payload)
    except ValidationFailedError as exc:
        await _close_webhook_log(log_id, status="FAILED", error=str(exc.detail if hasattr(exc, "detail") else exc)[:200])
        raise
    await _close_webhook_log(log_id, status="PROCESSED", result=new_status)
    return {"ok": True, "payment_status": new_status}


# ------------------------------------------------------------ admin orders
@router.get("/orders", summary="Admin order list")
async def admin_orders(
    order_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    user: AuthContext = order_read,
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if order_status:
        query["order_status"] = order_status
    if payment_status:
        query["payment_status"] = payment_status
    if q:
        # Pencarian memakai identifier yang memang sudah tersimpan pada order.
        term = {"$regex": q.strip(), "$options": "i"}
        query["$or"] = [
            {"order_number": term},
            {"customer.name": term},
            {"customer.email": term},
            {"fulfilment.awb_number": term},
        ]
    items, total = await orders.list(
        query, limit=limit, skip=skip, sort=(("created_at", -1),)
    )
    # Kedaluwarsa pembayaran diberlakukan server-side saat data dibaca.
    items = [await _expire_if_due(item) for item in items]
    return {"items": [_admin_order(i) for i in items], "total": total, "limit": limit, "skip": skip}


@router.get("/orders/{order_id}", summary="Admin order detail")
async def admin_order_detail(order_id: str, user: AuthContext = order_read) -> Dict[str, Any]:
    order = await orders.get(order_id)
    if not order:
        raise NotFoundError("Order not found")
    return await _admin_order_full(await _reconcile_payment(order))


@router.patch("/orders/{order_id}/status", summary="Update fulfilment status")
async def update_order_status(
    order_id: str, payload: OrderStatusUpdate, request: Request, user: AuthContext = order_write
) -> Dict[str, Any]:
    write_rate_limit(request)
    order = await orders.get(order_id)
    if not order:
        raise NotFoundError("Order not found")

    target = payload.order_status.value
    if target == "REFUNDED":
        # Alur refund berada di luar Fase 3 dan tidak boleh disimulasikan di sini.
        raise ValidationFailedError(
            "Status REFUNDED hanya dapat dihasilkan oleh alur pengembalian dana, bukan "
            "perubahan status manual."
        )
    blocker = fulfilment.transition_blocker(
        order, target, payment_configured=active_provider().is_configured()
    )
    if blocker:
        raise ValidationFailedError(blocker)

    changes: Dict[str, Any] = {"order_status": target}
    if target == "CANCELLED":
        changes["payment_status"] = (
            "FAILED" if order.get("payment_status") == "PENDING" else order.get("payment_status")
        )
    timestamp_field = fulfilment.STATUS_TIMESTAMP_FIELD.get(target)
    if timestamp_field:
        changes[timestamp_field] = datetime.now(timezone.utc).isoformat()
    # Kondisi `order_status` pada filter menjaga transisi tetap atomik bila dua
    # admin menekan tombol pada waktu bersamaan.
    result = await orders.coll.update_one(
        {"id": order_id, "order_status": order.get("order_status")},
        {
            "$set": changes,
            "$push": {
                "timeline": fulfilment.timeline_entry(
                    event=target,
                    status=target,
                    from_status=order.get("order_status"),
                    actor=user.email,
                    actor_type="ADMIN",
                    note=payload.note,
                )
            },
        },
    )
    if not result.modified_count:
        raise ValidationFailedError(
            "Status pesanan sudah berubah oleh proses lain. Muat ulang daftar pesanan."
        )
    updated = await orders.get(order_id) or {**order, **changes}
    if target == "CANCELLED":
        # Stok kembali tepat satu kali (idempoten) saat pesanan dibatalkan.
        await commerce_stock.restock(updated, actor=user.email, reason="Pesanan dibatalkan admin")
        updated = await orders.get(order_id) or updated
    await fulfilment.notify_customer_status(updated, target)
    logger.info(
        "commerce.order.status user=%s order=%s from=%s to=%s",
        user.email,
        order["order_number"],
        order.get("order_status"),
        target,
    )
    return _admin_order(updated)


@router.patch("/orders/{order_id}/fulfilment", summary="Simpan kurir, layanan & nomor resi (AWB)")
async def update_order_fulfilment(
    order_id: str,
    payload: OrderFulfilmentUpdate,
    request: Request,
    user: AuthContext = order_write,
) -> Dict[str, Any]:
    """Data pengiriman admin. Tidak memanggil API tracking apa pun (Fase 3)."""
    write_rate_limit(request)
    order = await orders.get(order_id)
    if not order:
        raise NotFoundError("Order not found")
    if order.get("order_status") in {"CANCELLED", "COMPLETED", "REFUNDED"}:
        raise ValidationFailedError(
            "Pesanan sudah final; data pengiriman tidak dapat diubah lagi."
        )

    incoming = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not incoming:
        raise ValidationFailedError("Tidak ada data pengiriman yang diisi.")

    existing = dict(order.get("fulfilment") or {})
    merged = {**existing, **incoming}
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    merged["updated_by"] = user.email

    await orders.coll.update_one(
        {"id": order_id},
        {
            "$set": {"fulfilment": merged},
            "$push": {
                "timeline": fulfilment.timeline_entry(
                    event="SHIPPING_UPDATED",
                    status=order.get("order_status"),
                    actor=user.email,
                    actor_type="ADMIN",
                    note=(
                        f"Resi {merged['awb_number']}"
                        if merged.get("awb_number")
                        else "Data kurir diperbarui"
                    ),
                )
            },
        },
    )
    logger.info("commerce.order.fulfilment user=%s order=%s", user.email, order["order_number"])
    return _admin_order(await orders.get(order_id) or order)


@router.post("/orders/{order_id}/cod-shipment", summary="Buat pengiriman COD (Delivery API resmi)")
async def create_cod_shipment(
    order_id: str, request: Request, user: AuthContext = order_write
) -> Dict[str, Any]:
    """Membuat shipment COD. Kegagalan TIDAK mengubah status pesanan."""
    write_rate_limit(request)
    order = await orders.get(order_id)
    if not order:
        raise NotFoundError("Order not found")
    if str(order.get("payment_method_choice") or "") != "COD":
        raise ValidationFailedError("Pesanan ini bukan COD.")
    if order.get("order_status") in {"CANCELLED", "COMPLETED", "REFUNDED", "REJECTED"}:
        raise ValidationFailedError("Pesanan sudah final; pengiriman COD tidak dapat dibuat.")
    existing = fulfilment.effective_shipment(order)
    if (order.get("fulfilment") or {}).get("cod_shipment_created"):
        raise ValidationFailedError("Pengiriman COD untuk pesanan ini sudah pernah dibuat.")
    try:
        result = await shipping.create_cod_shipment(order, existing)
    except ValidationFailedError as exc:
        message = str(getattr(exc, "detail", exc))
        await orders.coll.update_one(
            {"id": order_id},
            {
                "$push": {
                    "timeline": fulfilment.timeline_entry(
                        event="COD_SHIPMENT_FAILED",
                        status=order.get("order_status"),
                        actor=user.email,
                        actor_type="ADMIN",
                        note=message[:280],
                    )
                }
            },
        )
        logger.warning("commerce.cod_shipment.failed order=%s", order["order_number"])
        raise

    merged = {
        **(order.get("fulfilment") or {}),
        "courier_code": existing.get("courier_code"),
        "courier_name": existing.get("courier_name"),
        "service_code": existing.get("service_code"),
        "awb_number": result["awb_number"],
        "cod_shipment_created": True,
        "cod_shipment_reference": result.get("shipment_reference"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.email,
    }
    await orders.coll.update_one(
        {"id": order_id},
        {
            "$set": {"fulfilment": merged},
            "$push": {
                "timeline": fulfilment.timeline_entry(
                    event="COD_SHIPMENT_CREATED",
                    status=order.get("order_status"),
                    actor=user.email,
                    actor_type="ADMIN",
                    note=f"Resi {result['awb_number']}",
                )
            },
        },
    )
    return _admin_order(await orders.get(order_id) or order)


# -------------------------------------------------------------- admin refunds
@router.get("/refunds", summary="Admin: daftar pengajuan refund")
async def admin_refunds(
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    user: AuthContext = order_read,
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if q:
        term = {"$regex": q.strip(), "$options": "i"}
        query["$or"] = [{"order_number": term}, {"customer_email": term}]
    items, total = await refund_service.refunds.list(
        query, limit=limit, skip=skip, sort=(("created_at", -1),)
    )
    return {
        "items": [refund_service.public_refund(i) for i in items],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.patch("/refunds/{refund_id}/review", summary="Admin: setujui / tolak / tinjau refund")
async def review_refund(
    refund_id: str, payload: RefundReview, request: Request, user: AuthContext = order_write
) -> Dict[str, Any]:
    write_rate_limit(request)
    updated = await refund_service.review(
        refund_id, decision=payload.decision.value, note=payload.note, actor=user.email
    )
    return refund_service.public_refund(updated)


@router.post("/refunds/{refund_id}/process", summary="Admin: jalankan refund (Midtrans / COD manual)")
async def process_refund(
    refund_id: str, request: Request, user: AuthContext = order_write
) -> Dict[str, Any]:
    write_rate_limit(request)
    updated = await refund_service.process(refund_id, actor=user.email)
    return refund_service.public_refund(updated)


@router.post("/refunds/{refund_id}/manual-transfer", summary="Admin: catat transfer refund COD")
async def manual_refund_transfer(
    refund_id: str,
    payload: RefundManualTransfer,
    request: Request,
    user: AuthContext = order_write,
) -> Dict[str, Any]:
    write_rate_limit(request)
    updated = await refund_service.manual_transfer(
        refund_id,
        actor=user.email,
        amount=payload.amount,
        transfer_reference=payload.transfer_reference,
        transferred_at=payload.transferred_at,
        note=payload.note,
    )
    return refund_service.public_refund(updated)


# ------------------------------------------------- admin catalogue (CRUD)
router.include_router(
    build_crud_router(
        resource="product",
        collection=Collections.PRODUCTS,
        create_model=ProductBase,
        update_model=ProductUpdate,
        write_permission="merchandise:write",
        read_permission="merchandise:read",
        public_read=False,
        search_fields=("name", "sku"),
        filter_fields=("status", "category_id"),
        unique_fields=("slug",),
        default_sort=(("display_order", 1),),
    ),
    prefix="/catalog/products",
)
router.include_router(
    build_crud_router(
        resource="product-category",
        collection=Collections.PRODUCT_CATEGORIES,
        create_model=ProductCategoryBase,
        update_model=ProductCategoryUpdate,
        write_permission="merchandise:write",
        read_permission="merchandise:read",
        public_read=False,
        search_fields=("name",),
        filter_fields=("status",),
        unique_fields=("slug",),
        default_sort=(("display_order", 1),),
    ),
    prefix="/catalog/categories",
)
router.include_router(
    build_crud_router(
        resource="product-variant",
        collection=Collections.PRODUCT_VARIANTS,
        create_model=ProductVariantBase,
        update_model=ProductVariantUpdate,
        write_permission="merchandise:write",
        read_permission="merchandise:read",
        public_read=False,
        search_fields=("name", "sku"),
        filter_fields=("status", "product_id"),
        default_sort=(("display_order", 1),),
    ),
    prefix="/catalog/variants",
)
