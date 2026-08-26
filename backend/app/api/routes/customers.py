"""Fase 13 — Baraya ALSABBAT customer account API (additive).

Fully separated from the admin/RBAC authentication:
  * own collection      -> `customers`
  * own session store   -> `customer_sessions`
  * own JWT audience    -> claim `typ = "baraya"` (admin tokens never validate here)
Customers can only ever read their own profile and their own orders.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder

from app.api.crud_factory import Repository
from app.api.deps import get_current_customer, request_ip, require_permission
from app.core.database import Collections, get_db
from app.core.errors import (
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    ValidationFailedError,
)
from app.core.logging_config import get_logger
from app.core.rate_limit import enforce, login_guard
from app.core.security import (
    create_customer_access_token,
    hash_password,
    verify_password,
)
from app.models.auth import AuthContext
from app.models.customer import (
    CustomerAuthContext,
    CustomerLoginRequest,
    CustomerPasswordChange,
    CustomerProfileUpdate,
    CustomerRegisterRequest,
    CustomerStatusUpdate,
)
from app.models.base import new_id, utcnow

logger = get_logger(__name__)
router = APIRouter(tags=["baraya"])

customers = Repository(Collections.CUSTOMERS)
orders = Repository(Collections.ORDERS)

customer_read = Depends(require_permission("user:read"))
customer_write = Depends(require_permission("user:write"))

INVALID_CREDENTIALS = "Email atau kata sandi tidak sesuai."


def _public_customer(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc = dict(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return jsonable_encoder(doc)


def _public_order(order: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in order.items()
        if key not in {"payment_raw", "payment_provider_payload", "_id"}
    }


async def _issue_session(customer: Dict[str, Any], request: Request) -> Dict[str, Any]:
    token, jti, expires_at = create_customer_access_token(customer["id"])
    db = get_db()
    await db[Collections.CUSTOMER_SESSIONS].insert_one(
        {
            "id": new_id(),
            "jti": jti,
            "customer_id": customer["id"],
            "ip": request_ip(request),
            "user_agent": request.headers.get("user-agent", "")[:300],
            "revoked": False,
            "expires_at": jsonable_encoder(expires_at),
            "created_at": jsonable_encoder(utcnow()),
        }
    )
    await customers.coll.update_one(
        {"id": customer["id"]}, {"$set": {"last_login_at": jsonable_encoder(utcnow())}}
    )
    fresh = await customers.get(customer["id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": jsonable_encoder(expires_at),
        "customer": _public_customer(fresh or customer),
    }


# ----------------------------------------------------------------- register
@router.post("/register", status_code=201, summary="Daftar akun Baraya ALSABBAT")
async def register(payload: CustomerRegisterRequest, request: Request) -> Dict[str, Any]:
    await enforce(request, "baraya-register", 8, 3600)
    email = payload.email.lower().strip()
    if await customers.get_by({"email": email}):
        raise ConflictError("Email ini sudah terdaftar sebagai Baraya ALSABBAT.")
    created = await customers.create(
        {
            "email": email,
            "full_name": payload.full_name,
            "phone": payload.phone,
            "password_hash": hash_password(payload.password),
            "status": "ACTIVE",
            "last_login_at": None,
        }
    )
    logger.info("baraya.register email=%s", email)
    return {"success": True, "customer": _public_customer(created)}


# -------------------------------------------------------------------- login
@router.post("/login", summary="Login Baraya ALSABBAT")
async def login(payload: CustomerLoginRequest, request: Request) -> Dict[str, Any]:
    await login_guard(request)
    email = payload.email.lower().strip()
    customer = await customers.get_by({"email": email})
    if not customer or not verify_password(payload.password, customer.get("password_hash", "")):
        logger.warning("baraya.login.failed email=%s ip=%s", email, request_ip(request))
        raise UnauthorizedError(INVALID_CREDENTIALS)
    if customer.get("status") != "ACTIVE":
        raise UnauthorizedError("Akun Baraya ini tidak aktif. Hubungi klub untuk bantuan.")
    return await _issue_session(customer, request)


@router.post("/logout", summary="Keluar dari akun Baraya")
async def logout(customer: CustomerAuthContext = Depends(get_current_customer)) -> Dict[str, Any]:
    await get_db()[Collections.CUSTOMER_SESSIONS].update_one(
        {"jti": customer.jti},
        {"$set": {"revoked": True, "revoked_at": jsonable_encoder(utcnow())}},
    )
    return {"success": True, "message": "Anda telah keluar."}


# ------------------------------------------------------------------ profile
@router.get("/me", summary="Profil Baraya yang sedang login")
async def me(customer: CustomerAuthContext = Depends(get_current_customer)) -> Dict[str, Any]:
    doc = await customers.get(customer.customer_id)
    if not doc:
        raise UnauthorizedError("Akun tidak ditemukan.")
    return _public_customer(doc)


@router.patch("/me", summary="Perbarui profil Baraya")
async def update_me(
    payload: CustomerProfileUpdate,
    request: Request,
    customer: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    await enforce(request, "baraya-profile", 20, 600)
    changes = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not changes:
        raise ValidationFailedError("Tidak ada data yang diperbarui.")
    updated = await customers.update(customer.customer_id, changes)
    return _public_customer(updated or {})


@router.post("/change-password", summary="Ubah kata sandi Baraya")
async def change_password(
    payload: CustomerPasswordChange,
    request: Request,
    customer: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    await enforce(request, "baraya-password", 10, 900)
    doc = await customers.get_by({"id": customer.customer_id})
    if not doc or not verify_password(payload.current_password, doc.get("password_hash", "")):
        raise UnauthorizedError("Kata sandi saat ini tidak sesuai.")
    await customers.coll.update_one(
        {"id": customer.customer_id},
        {
            "$set": {
                "password_hash": hash_password(payload.new_password),
                "updated_at": jsonable_encoder(utcnow()),
            }
        },
    )
    await get_db()[Collections.CUSTOMER_SESSIONS].update_many(
        {"customer_id": customer.customer_id, "jti": {"$ne": customer.jti}},
        {"$set": {"revoked": True}},
    )
    return {"success": True, "message": "Kata sandi diperbarui."}


# ------------------------------------------------------------------- orders
@router.get("/orders", summary="Riwayat pesanan milik Baraya yang login")
async def my_orders(
    limit: int = Query(default=20, ge=1, le=50),
    skip: int = Query(default=0, ge=0),
    customer: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    items, total = await orders.list(
        {"customer_id": customer.customer_id},
        limit=limit,
        skip=skip,
        sort=(("created_at", -1),),
    )
    return {
        "items": [_public_order(order) for order in items],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.get("/orders/{order_id}", summary="Detail pesanan milik Baraya yang login")
async def my_order_detail(
    order_id: str, customer: CustomerAuthContext = Depends(get_current_customer)
) -> Dict[str, Any]:
    order = await orders.get_by({"id": order_id, "customer_id": customer.customer_id})
    if not order:
        raise NotFoundError("Pesanan tidak ditemukan.")
    return _public_order(order)


# --------------------------------------------------- admin customer console
@router.get("/admin/list", summary="Admin: daftar akun Baraya")
async def admin_list(
    q: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    user: AuthContext = customer_read,
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if q:
        query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"full_name": {"$regex": q, "$options": "i"}},
        ]
    items, total = await customers.list(query, limit=limit, skip=skip, sort=(("created_at", -1),))
    return {
        "items": [_public_customer(item) for item in items],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.patch("/admin/{customer_id}/status", summary="Admin: aktifkan/nonaktifkan akun Baraya")
async def admin_set_status(
    customer_id: str, payload: CustomerStatusUpdate, user: AuthContext = customer_write
) -> Dict[str, Any]:
    existing = await customers.get(customer_id)
    if not existing:
        raise NotFoundError("Akun Baraya tidak ditemukan.")
    updated = await customers.update(customer_id, {"status": payload.status.value})
    if payload.status.value != "ACTIVE":
        await get_db()[Collections.CUSTOMER_SESSIONS].update_many(
            {"customer_id": customer_id}, {"$set": {"revoked": True}}
        )
    logger.info("baraya.admin.status admin=%s customer=%s status=%s", user.email, customer_id, payload.status.value)
    return _public_customer(updated or existing)
