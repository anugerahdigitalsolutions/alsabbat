"""Merchandise & Commerce API (Phase 9) — additive module.

Public   : products, product detail, categories, cart revalidation
Admin    : product / category / variant CRUD, stock, orders, fulfilment
Payments : provider status, official gateway session, verified webhook

Prices and stock are ALWAYS resolved server-side; the client total is ignored.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request

from app.api.crud_factory import Repository, build_crud_router
from app.api.deps import optional_customer, require_permission
from app.models.customer import CustomerAuthContext
from app.core.database import Collections, get_db
from app.core.errors import NotFoundError, ValidationFailedError
from app.core.logging_config import get_logger
from app.core.rate_limit import checkout_guard, public_rate_limit, webhook_guard, write_rate_limit
from app.models.auth import AuthContext
from app.models.commerce import (
    CheckoutRequest,
    OrderStatusUpdate,
    ProductBase,
    ProductCategoryBase,
    ProductCategoryUpdate,
    ProductUpdate,
    ProductVariantBase,
    ProductVariantUpdate,
)
from app.services.payments import active_provider, provider_status

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
    items = []
    for media_id in ids:
        doc = await media.get(media_id)
        if doc:
            items.append({"id": doc["id"], "url": doc.get("url"), "alt_text": doc.get("alt_text")})
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
    enriched = {
        **product,
        "cover_url": (cover or {}).get("url"),
        "category": {"id": category["id"], "name": category.get("name"), "slug": category.get("slug")}
        if category
        else None,
        "variant_count": len(variant_items),
        "available_stock": available,
        "in_stock": available > 0,
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
    return {
        "product_id": product["id"],
        "variant_id": (variant or {}).get("id"),
        "product_name": product["name"],
        "variant_name": (variant or {}).get("name"),
        "quantity": quantity,
        "unit_price": unit_price,
        "subtotal": unit_price * quantity,
        "currency": product.get("currency") or "IDR",
    }


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


# ----------------------------------------------------- payment reconciliation
TERMINAL_PAYMENT_STATUS = {"PAID", "FAILED", "EXPIRED", "REFUNDED"}


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
    if result.modified_count and new_status == "PAID":
        # Finalize stock only once, after a verified payment.
        for item in order["items"]:
            if item.get("variant_id"):
                await variants.coll.update_one(
                    {"id": item["variant_id"]}, {"$inc": {"stock_quantity": -int(item["quantity"])}}
                )
            else:
                await products.coll.update_one(
                    {"id": item["product_id"]}, {"$inc": {"stock_quantity": -int(item["quantity"])}}
                )
    logger.info("commerce.payment.%s order=%s", new_status, order["order_number"])
    return new_status


async def _reconcile_payment(order: Dict[str, Any]) -> Dict[str, Any]:
    """Pull the authoritative status from the gateway when still pending.

    Guards against a lost webhook; a frontend redirect alone is never trusted.
    """
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
    order_number = await _next_order_number()
    order = await orders.create(
        {
            "order_number": order_number,
            "customer_id": customer.customer_id if customer else None,
            "customer": payload.customer.model_dump(),
            "shipping": payload.shipping.model_dump(),
            "items": items,
            "subtotal": subtotal,
            "shipping_cost": SHIPPING_FLAT,
            "total": subtotal + SHIPPING_FLAT,
            "currency": "IDR",
            "order_status": "PENDING",
            "payment_status": "PENDING",
            "payment_provider": active_provider().name,
            "payment_reference": None,
            "payment_redirect_url": None,
        }
    )

    session = await active_provider().create_session(order)
    update: Dict[str, Any] = {
        "payment_reference": session.reference,
        "payment_redirect_url": session.redirect_url,
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
    return _public_order(await _reconcile_payment(order))


# ----------------------------------------------------------------- webhook
@router.post("/payment/webhook", summary="Payment gateway notification (verified)")
async def payment_webhook(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    await webhook_guard(request)
    provider = active_provider()
    if not provider.verify_notification(payload):
        raise ValidationFailedError("Signature notifikasi pembayaran tidak valid.")

    order = await orders.get_by({"order_number": str(payload.get("order_id"))})
    if not order:
        raise NotFoundError("Order tidak ditemukan")
    if order.get("payment_status") in TERMINAL_PAYMENT_STATUS:
        return {"ok": True, "duplicate": True}
    new_status = await _apply_payment_status(order, payload)
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
        query["order_number"] = {"$regex": q, "$options": "i"}
    items, total = await orders.list(query, limit=limit, skip=skip)
    return {"items": [_public_order(i) for i in items], "total": total, "limit": limit, "skip": skip}


@router.get("/orders/{order_id}", summary="Admin order detail")
async def admin_order_detail(order_id: str, user: AuthContext = order_read) -> Dict[str, Any]:
    order = await orders.get(order_id)
    if not order:
        raise NotFoundError("Order not found")
    return _public_order(await _reconcile_payment(order))


@router.patch("/orders/{order_id}/status", summary="Update fulfilment status")
async def update_order_status(
    order_id: str, payload: OrderStatusUpdate, request: Request, user: AuthContext = order_write
) -> Dict[str, Any]:
    write_rate_limit(request)
    order = await orders.get(order_id)
    if not order:
        raise NotFoundError("Order not found")
    updated = await orders.update(order_id, {"order_status": payload.order_status.value})
    logger.info(
        "commerce.order.status user=%s order=%s status=%s",
        user.email,
        order["order_number"],
        payload.order_status.value,
    )
    return _public_order(updated or order)


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
