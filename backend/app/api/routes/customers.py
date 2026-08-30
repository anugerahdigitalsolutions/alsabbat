"""Fase 13 — Baraya ALSABBAT customer account API (additive).

Fully separated from the admin/RBAC authentication:
  * own collection      -> `customers`
  * own session store   -> `customer_sessions`
  * own JWT audience    -> claim `typ = "baraya"` (admin tokens never validate here)
Customers can only ever read their own profile and their own orders.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from fastapi.encoders import jsonable_encoder

from app.api.crud_factory import Repository
from app.api.deps import get_current_customer, request_ip, require_permission
from app.core.database import Collections, get_db
from app.core.config import settings
from app.core.errors import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationFailedError,
)
from app.core.logging_config import get_logger
from app.core.rate_limit import enforce, login_guard, write_rate_limit
from app.core.security import (
    create_customer_access_token,
    hash_password,
    verify_password,
)
from app.models.auth import AuthContext
from app.models.customer import (
    CustomerAuthContext,
    CustomerForgotPasswordRequest,
    CustomerLoginRequest,
    CustomerPasswordChange,
    CustomerProfileUpdate,
    CustomerRegisterRequest,
    CustomerResetPasswordRequest,
    CustomerStatusUpdate,
)
from app.models.base import new_id, utcnow
from app.models.enums import MediaType
from app.services.mailer import send_customer_password_reset_email
from app.services.otp import PURPOSE_REGISTER, issue_otp
from app.services.media_service import media_service
from app.services.membership import (
    ensure_member_identity,
    member_card_payload,
    member_verification_payload,
)

logger = get_logger(__name__)
router = APIRouter(tags=["baraya"])
member_router = APIRouter(tags=["member"])

customers = Repository(Collections.CUSTOMERS)
orders = Repository(Collections.ORDERS)

customer_read = Depends(require_permission("member:read"))
customer_write = Depends(require_permission("member:write"))

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
@router.post("/register", status_code=201, summary="Daftar akun Baraya AL SABBAT")
async def register(payload: CustomerRegisterRequest, request: Request) -> Dict[str, Any]:
    await enforce(request, "baraya-register", 8, 3600)
    email = payload.email.lower().strip()
    existing = await customers.get_by({"email": email})
    if existing:
        # Fase 3: pendaftaran yang belum diverifikasi boleh dilanjutkan dengan
        # mengirim ulang OTP (tidak membuat akun ganda).
        if existing.get("email_verified", True):
            raise ConflictError("Email ini sudah terdaftar sebagai Baraya AL SABBAT.")
        otp = await issue_otp(
            email=email, full_name=existing.get("full_name", ""), purpose=PURPOSE_REGISTER
        )
        return {
            "success": True,
            "verification_required": True,
            "email": email,
            "otp_delivered": otp["delivered"],
            "customer": _public_customer(existing),
        }
    created = await customers.create(
        {
            "email": email,
            "full_name": payload.full_name,
            "phone": payload.phone,
            "password_hash": hash_password(payload.password),
            "status": "ACTIVE",
            "role": "MEMBER",
            "email_verified": False,
            "auth_provider": "PASSWORD",
            "last_login_at": None,
        }
    )
    created = await ensure_member_identity(created)
    otp = await issue_otp(email=email, full_name=payload.full_name, purpose=PURPOSE_REGISTER)
    logger.info("baraya.register email=%s member=%s", email, created.get("member_number"))
    return {
        "success": True,
        "verification_required": True,
        "email": email,
        "otp_delivered": otp["delivered"],
        "customer": _public_customer(created),
    }


# -------------------------------------------------------------------- login
@router.post("/login", summary="Login Baraya AL SABBAT")
async def login(payload: CustomerLoginRequest, request: Request) -> Dict[str, Any]:
    await login_guard(request)
    email = payload.email.lower().strip()
    customer = await customers.get_by({"email": email})
    if not customer or not verify_password(payload.password, customer.get("password_hash", "")):
        logger.warning("baraya.login.failed email=%s ip=%s", email, request_ip(request))
        raise UnauthorizedError(INVALID_CREDENTIALS)
    if customer.get("status") != "ACTIVE":
        raise UnauthorizedError("Akun Baraya ini tidak aktif. Hubungi klub untuk bantuan.")
    # Akun lama (sebelum Fase 3) tidak punya field ini → dianggap terverifikasi.
    if not customer.get("email_verified", True):
        otp = await issue_otp(
            email=email, full_name=customer.get("full_name", ""), purpose=PURPOSE_REGISTER
        )
        raise ForbiddenError(
            "Email Anda belum diverifikasi. Kami mengirim kode verifikasi baru ke email Anda."
            if otp["delivered"]
            else "Email Anda belum diverifikasi. Kode verifikasi baru sudah dibuat, "
            "namun pengiriman email belum dikonfigurasi di server."
        )
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
    doc = await ensure_member_identity(doc)
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


# ---------------------------------------------------- forgot / reset password
GENERIC_RESET_RESPONSE = {
    "message": "Jika email terdaftar, instruksi reset kata sandi telah dikirim."
}
INVALID_RESET_TOKEN = "Tautan reset tidak valid atau sudah kedaluwarsa."


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/forgot-password", summary="Minta instruksi reset kata sandi Baraya")
async def forgot_password(
    payload: CustomerForgotPasswordRequest, request: Request
) -> Dict[str, Any]:
    await enforce(request, "baraya-forgot", 5, 900)
    email = payload.email.lower().strip()
    # A token is always generated so the response cost does not reveal existence.
    token = secrets.token_urlsafe(32)
    token_hash = _hash_reset_token(token)
    customer = await customers.get_by({"email": email})

    if customer and customer.get("status") == "ACTIVE":
        expires_at = utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
        await get_db()[Collections.CUSTOMER_PASSWORD_RESETS].insert_one(
            {
                "id": new_id(),
                "customer_id": customer["id"],
                "token_hash": token_hash,
                "expires_at": jsonable_encoder(expires_at),
                "used_at": None,
                "created_at": jsonable_encoder(utcnow()),
            }
        )
        await send_customer_password_reset_email(
            email=customer["email"],
            full_name=customer.get("full_name", ""),
            token=token,
            expires_minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
        )
    logger.info("baraya.forgot_password requested ip=%s", request_ip(request))
    return dict(GENERIC_RESET_RESPONSE)


@router.post("/reset-password", summary="Reset kata sandi Baraya dengan token")
async def reset_password(
    payload: CustomerResetPasswordRequest, request: Request
) -> Dict[str, Any]:
    await enforce(request, "baraya-reset", 10, 900)
    db = get_db()
    now = jsonable_encoder(utcnow())
    # Atomic single-use claim: only one caller can ever flip `used_at`.
    reset = await db[Collections.CUSTOMER_PASSWORD_RESETS].find_one_and_update(
        {
            "token_hash": _hash_reset_token(payload.token),
            "used_at": None,
            "expires_at": {"$gt": now},
        },
        {"$set": {"used_at": now}},
    )
    if not reset:
        raise UnauthorizedError(INVALID_RESET_TOKEN)

    customer = await customers.get(reset["customer_id"])
    if not customer or customer.get("status") != "ACTIVE":
        raise UnauthorizedError(INVALID_RESET_TOKEN)

    await customers.coll.update_one(
        {"id": customer["id"]},
        {"$set": {"password_hash": hash_password(payload.password), "updated_at": now}},
    )
    await db[Collections.CUSTOMER_SESSIONS].update_many(
        {"customer_id": customer["id"]}, {"$set": {"revoked": True, "revoked_at": now}}
    )
    await db[Collections.CUSTOMER_PASSWORD_RESETS].update_many(
        {"customer_id": customer["id"], "used_at": None}, {"$set": {"used_at": now}}
    )
    logger.info("baraya.reset_password success customer=%s", customer["id"])
    return {"success": True, "message": "Kata sandi berhasil diperbarui. Silakan login kembali."}


# ------------------------------------------------------------- profile photo
@router.post("/me/photo", summary="Upload foto profil Baraya (milik sendiri)")
async def upload_my_photo(
    request: Request,
    file: UploadFile = File(...),
    customer: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    write_rate_limit(request)
    doc = await customers.get(customer.customer_id)
    if not doc:
        raise UnauthorizedError("Akun tidak ditemukan.")
    content = await file.read()
    stored, media_type = await media_service.store(
        file.filename or "foto", content, file.content_type or "application/octet-stream"
    )
    if media_type != MediaType.IMAGE:
        await media_service.remove(stored.storage_key)
        raise ValidationFailedError("Hanya berkas gambar yang diizinkan untuk foto profil.")
    await customers.update(customer.customer_id, {"photo_url": stored.url})
    logger.info("baraya.photo.upload customer=%s", customer.customer_id)
    return {"success": True, "photo_url": stored.url}


@router.post("/me/upload", summary="Upload foto untuk pengajuan (tanpa mengubah foto profil)")
async def upload_application_photo(
    request: Request,
    file: UploadFile = File(...),
    customer: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    """Foto Pemain & Staf disimpan terpisah, jadi upload ini TIDAK menyentuh photo_url akun."""
    write_rate_limit(request)
    content = await file.read()
    stored, media_type = await media_service.store(
        file.filename or "foto", content, file.content_type or "application/octet-stream"
    )
    if media_type != MediaType.IMAGE:
        await media_service.remove(stored.storage_key)
        raise ValidationFailedError("Hanya berkas gambar yang diizinkan.")
    logger.info("baraya.application_photo.upload customer=%s", customer.customer_id)
    return {"success": True, "photo_url": stored.url}


@router.delete("/me/photo", summary="Hapus foto profil Baraya (milik sendiri)")
async def delete_my_photo(
    customer: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    await customers.update(customer.customer_id, {"photo_url": ""})
    return {"success": True, "photo_url": ""}


# -------------------------------------------------------------- member card
@router.get("/member-card", summary="Kartu member Baraya milik akun yang login")
async def my_member_card(
    customer: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    doc = await customers.get(customer.customer_id)
    if not doc:
        raise UnauthorizedError("Akun tidak ditemukan.")
    doc = await ensure_member_identity(doc)
    return member_card_payload(doc)


@member_router.get("/verify/{member_code}", summary="Verifikasi publik kartu member (data minimum)")
async def verify_member(member_code: str, request: Request) -> Dict[str, Any]:
    await enforce(request, "member-verify", 60, 600)
    if len(member_code) < 10 or len(member_code) > 120:
        return member_verification_payload(None)
    doc = await customers.get_by({"member_code": member_code})
    return member_verification_payload(doc)


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
@router.get("/admin/{customer_id}/member-card", summary="Admin: pratinjau kartu member Baraya")
async def admin_member_card(customer_id: str, user: AuthContext = customer_read) -> Dict[str, Any]:
    doc = await customers.get(customer_id)
    if not doc:
        raise NotFoundError("Akun Baraya tidak ditemukan.")
    doc = await ensure_member_identity(doc)
    return member_card_payload(doc)


@router.get("/admin/stats", summary="Admin: ringkasan Baraya (data nyata)")
async def admin_member_stats(user: AuthContext = customer_read) -> Dict[str, Any]:
    coll = customers.coll
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    return {
        "total": await coll.count_documents({}),
        "active": await coll.count_documents({"status": "ACTIVE"}),
        "inactive": await coll.count_documents({"status": "INACTIVE"}),
        "new_this_month": await coll.count_documents({"created_at": {"$gte": month_start}}),
    }


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
