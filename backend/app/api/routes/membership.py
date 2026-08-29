"""Fase 3 — OTP, Login Google, peran anggota, dan pengajuan Pemain/Staf.

Additive: memakai koleksi `customers` + sesi Baraya existing (Fase 13),
tanpa sistem autentikasi kedua. Semua kredensial hanya dari environment.
"""
from __future__ import annotations

import secrets
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder

from app.api.crud_factory import Repository
from app.api.deps import get_current_customer, optional_customer, request_ip, require_permission
from app.api.routes.customers import _issue_session, _public_customer
from app.core.database import Collections, get_db
from app.core.errors import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationFailedError,
)
from app.core.logging_config import get_logger
from app.core.rate_limit import enforce, login_guard
from app.core.security import hash_password
from app.models.auth import AuthContext
from app.models.base import utcnow
from app.models.customer import CustomerAuthContext
from app.models.membership import (
    GALLERY_ROLES,
    ApplicationCreate,
    ApplicationDecision,
    ApplicationStatus,
    ApplicationType,
    GoogleLoginPayload,
    OtpRequestPayload,
    OtpResetPasswordPayload,
    OtpVerifyPayload,
    RoleUpdate,
)
from app.services import google_auth
from app.services.mailer import mail_status
from app.services.membership import ensure_member_identity
from app.services.otp import PURPOSE_REGISTER, PURPOSE_RESET, issue_otp, verify_otp

logger = get_logger(__name__)
router = APIRouter(tags=["baraya-membership"])

customers = Repository(Collections.CUSTOMERS)
applications = Repository(Collections.MEMBER_APPLICATIONS)
players = Repository(Collections.PLAYERS)
staff = Repository(Collections.STAFF)

member_read = Depends(require_permission("user:read"))
member_write = Depends(require_permission("user:write"))

GENERIC_OTP_RESPONSE = "Jika email terdaftar, kode verifikasi telah dikirim."
INVALID_OTP = "Kode verifikasi salah atau sudah kedaluwarsa."


# ----------------------------------------------------------- konfigurasi auth
@router.get("/auth/config", summary="Konfigurasi login publik (tanpa secret)")
async def auth_config() -> Dict[str, Any]:
    google = google_auth.google_status()
    mail = mail_status()
    return {
        "google_enabled": google["configured"],
        "google_client_id": google["client_id"],
        "email_enabled": mail["configured"],
        "email_provider": mail["provider"],
    }


# ------------------------------------------------------------------------ OTP
@router.post("/otp/request", summary="Kirim ulang kode OTP (pendaftaran / reset)")
async def request_otp(payload: OtpRequestPayload, request: Request) -> Dict[str, Any]:
    await enforce(request, "baraya-otp-request", 6, 900)
    email = payload.email.lower().strip()
    purpose = PURPOSE_REGISTER if payload.purpose.value == "REGISTER" else PURPOSE_RESET
    customer = await customers.get_by({"email": email})

    delivered = False
    if customer and customer.get("status") == "ACTIVE":
        if purpose == PURPOSE_REGISTER and customer.get("email_verified", False):
            raise ConflictError("Email ini sudah terverifikasi. Silakan langsung login.")
        result = await issue_otp(
            email=email, full_name=customer.get("full_name", ""), purpose=purpose
        )
        delivered = result["delivered"]
    logger.info("baraya.otp.request purpose=%s ip=%s", purpose, request_ip(request))
    return {"message": GENERIC_OTP_RESPONSE, "delivered": delivered}


@router.post("/otp/verify", summary="Verifikasi email pendaftaran dengan OTP")
async def verify_registration_otp(payload: OtpVerifyPayload, request: Request) -> Dict[str, Any]:
    await enforce(request, "baraya-otp-verify", 12, 900)
    email = payload.email.lower().strip()
    if not await verify_otp(email=email, purpose=PURPOSE_REGISTER, code=payload.code):
        raise UnauthorizedError(INVALID_OTP)
    customer = await customers.get_by({"email": email})
    if not customer or customer.get("status") != "ACTIVE":
        raise UnauthorizedError(INVALID_OTP)
    await customers.coll.update_one(
        {"id": customer["id"]},
        {"$set": {"email_verified": True, "updated_at": jsonable_encoder(utcnow())}},
    )
    fresh = await ensure_member_identity(await customers.get(customer["id"]))
    logger.info("baraya.otp.verified customer=%s", customer["id"])
    return await _issue_session(fresh, request)


@router.post("/reset-password-otp", summary="Reset kata sandi memakai kode OTP")
async def reset_password_with_otp(
    payload: OtpResetPasswordPayload, request: Request
) -> Dict[str, Any]:
    await enforce(request, "baraya-otp-reset", 10, 900)
    email = payload.email.lower().strip()
    if not await verify_otp(email=email, purpose=PURPOSE_RESET, code=payload.code):
        raise UnauthorizedError(INVALID_OTP)
    customer = await customers.get_by({"email": email})
    if not customer or customer.get("status") != "ACTIVE":
        raise UnauthorizedError(INVALID_OTP)
    now = jsonable_encoder(utcnow())
    await customers.coll.update_one(
        {"id": customer["id"]},
        {
            "$set": {
                "password_hash": hash_password(payload.password),
                "email_verified": True,
                "updated_at": now,
            }
        },
    )
    await get_db()[Collections.CUSTOMER_SESSIONS].update_many(
        {"customer_id": customer["id"]}, {"$set": {"revoked": True, "revoked_at": now}}
    )
    logger.info("baraya.reset_password_otp customer=%s", customer["id"])
    return {"success": True, "message": "Kata sandi diperbarui. Silakan login kembali."}


# --------------------------------------------------------------- login Google
@router.post("/google/login", summary="Login/daftar Baraya dengan akun Google")
async def google_login(payload: GoogleLoginPayload, request: Request) -> Dict[str, Any]:
    await login_guard(request)
    profile = await google_auth.exchange_code(
        code=payload.code, redirect_uri=payload.redirect_uri
    )
    customer = await customers.get_by({"email": profile["email"]})
    if customer:
        if customer.get("status") != "ACTIVE":
            raise UnauthorizedError("Akun Baraya ini tidak aktif. Hubungi klub untuk bantuan.")
        await customers.coll.update_one(
            {"id": customer["id"]},
            {
                "$set": {
                    "google_id": profile["google_id"],
                    "email_verified": True,
                    "updated_at": jsonable_encoder(utcnow()),
                }
            },
        )
        customer = await customers.get(customer["id"])
    else:
        customer = await customers.create(
            {
                "email": profile["email"],
                "full_name": profile["full_name"],
                "phone": "",
                # Akun Google tidak memakai kata sandi lokal: hash acak yang
                # tidak mungkin dipakai login sampai user melakukan reset.
                "password_hash": hash_password(secrets.token_urlsafe(24) + "a1"),
                "status": "ACTIVE",
                "role": "MEMBER",
                "email_verified": True,
                "google_id": profile["google_id"],
                "auth_provider": "GOOGLE",
                "last_login_at": None,
            }
        )
        logger.info("baraya.google.register email=%s", profile["email"])
    customer = await ensure_member_identity(customer)
    return await _issue_session(customer, request)


# ------------------------------------------------------------------ hak akses
def _role_of(customer: Optional[Dict[str, Any]]) -> str:
    if not customer:
        return "GUEST"
    return customer.get("role") or "MEMBER"


@router.get("/access", summary="Hak akses konten untuk akun yang sedang login")
async def my_access(
    auth: Optional[CustomerAuthContext] = Depends(optional_customer),
) -> Dict[str, Any]:
    doc = await customers.get(auth.customer_id) if auth else None
    role = _role_of(doc)
    return {
        "role": role,
        "can_view_gallery": role in GALLERY_ROLES,
        "can_view_spotlight": role in GALLERY_ROLES,
    }


# ----------------------------------------------------- pengajuan pemain/staf
def _public_application(doc: Dict[str, Any]) -> Dict[str, Any]:
    clean = {k: v for k, v in doc.items() if k != "_id"}
    return jsonable_encoder(clean)


@router.post("/applications", status_code=201, summary="Ajukan diri sebagai Pemain atau Staf")
async def create_application(
    payload: ApplicationCreate,
    request: Request,
    auth: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    await enforce(request, "baraya-application", 5, 3600)
    customer = await customers.get(auth.customer_id)
    if not customer:
        raise UnauthorizedError("Akun tidak ditemukan.")
    if _role_of(customer) == payload.type.value:
        raise ConflictError(f"Akun Anda sudah berstatus {payload.type.value}.")
    pending = await applications.get_by(
        {"customer_id": auth.customer_id, "type": payload.type.value, "status": "PENDING"}
    )
    if pending:
        raise ConflictError("Pengajuan Anda masih diproses pengurus klub.")

    created = await applications.create(
        {
            **payload.model_dump(),
            "type": payload.type.value,
            "customer_id": auth.customer_id,
            "email": customer["email"],
            "status": "PENDING",
            "note": None,
            "decided_by": None,
            "decided_at": None,
            "player_id": None,
            "staff_id": None,
        }
    )
    logger.info("baraya.application.created customer=%s type=%s", auth.customer_id, payload.type.value)
    return _public_application(created)


@router.get("/applications/mine", summary="Pengajuan milik akun yang login")
async def my_applications(
    auth: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    items, total = await applications.list(
        {"customer_id": auth.customer_id}, limit=20, sort=(("created_at", -1),)
    )
    return {"items": [_public_application(item) for item in items], "total": total}


# --------------------------------------------------------- konsol admin Fase 3
@router.get("/admin/auth-settings", summary="Admin: status konfigurasi OTP & Google (tanpa secret)")
async def admin_auth_settings(user: AuthContext = member_read) -> Dict[str, Any]:
    return {"email": mail_status(), "google": google_auth.google_status()}


@router.get("/admin/applications", summary="Admin: daftar pengajuan Pemain/Staf")
async def admin_applications(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    user: AuthContext = member_read,
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    items, total = await applications.list(query, limit=limit, skip=skip, sort=(("created_at", -1),))
    enriched = []
    for item in items:
        customer = await customers.get(item["customer_id"])
        enriched.append(
            {
                **_public_application(item),
                "customer": _public_customer(customer) if customer else None,
            }
        )
    return {"items": enriched, "total": total, "limit": limit, "skip": skip}


async def _validate_link(app_type: str, player_id: Optional[str], staff_id: Optional[str]) -> Dict[str, Any]:
    """Pengajuan disetujui HARUS ditautkan ke record existing (keputusan user)."""
    if app_type == ApplicationType.PEMAIN.value:
        if not player_id:
            raise ValidationFailedError(
                "Pilih record Pemain yang sudah ada untuk ditautkan sebelum menyetujui."
            )
        if not await players.get(player_id):
            raise NotFoundError("Record pemain tidak ditemukan.")
        return {"player_id": player_id, "staff_id": None}
    if not staff_id:
        raise ValidationFailedError(
            "Pilih record Staf yang sudah ada untuk ditautkan sebelum menyetujui."
        )
    if not await staff.get(staff_id):
        raise NotFoundError("Record staf tidak ditemukan.")
    return {"player_id": None, "staff_id": staff_id}


@router.patch("/admin/applications/{application_id}", summary="Admin: setujui/tolak pengajuan")
async def admin_decide_application(
    application_id: str, payload: ApplicationDecision, user: AuthContext = member_write
) -> Dict[str, Any]:
    existing = await applications.get(application_id)
    if not existing:
        raise NotFoundError("Pengajuan tidak ditemukan.")
    if existing.get("status") != "PENDING":
        raise ConflictError("Pengajuan ini sudah diputuskan.")

    changes: Dict[str, Any] = {
        "status": payload.decision.value,
        "note": payload.note,
        "decided_by": user.email,
        "decided_at": jsonable_encoder(utcnow()),
    }

    if payload.decision == ApplicationStatus.APPROVED:
        link = await _validate_link(existing["type"], payload.player_id, payload.staff_id)
        changes.update(link)
        await customers.update(
            existing["customer_id"],
            {
                "role": existing["type"],
                **{k: v for k, v in link.items() if v is not None},
            },
        )
        logger.info(
            "baraya.application.approved admin=%s customer=%s role=%s",
            user.email,
            existing["customer_id"],
            existing["type"],
        )

    updated = await applications.update(application_id, changes)
    customer = await customers.get(existing["customer_id"])
    return {
        **_public_application(updated or existing),
        "customer": _public_customer(customer) if customer else None,
    }


@router.patch("/admin/{customer_id}/role", summary="Admin: ubah peran akun Baraya")
async def admin_set_role(
    customer_id: str, payload: RoleUpdate, user: AuthContext = member_write
) -> Dict[str, Any]:
    existing = await customers.get(customer_id)
    if not existing:
        raise NotFoundError("Akun Baraya tidak ditemukan.")
    changes: Dict[str, Any] = {"role": payload.role.value}
    if payload.role.value == "PEMAIN":
        link = await _validate_link("PEMAIN", payload.player_id, None)
        changes["player_id"] = link["player_id"]
        updated = await customers.update(customer_id, changes)
    elif payload.role.value == "STAFF":
        link = await _validate_link("STAFF", None, payload.staff_id)
        changes["staff_id"] = link["staff_id"]
        updated = await customers.update(customer_id, changes)
    else:
        # Turun ke MEMBER: tautan pemain/staf dilepas sepenuhnya.
        await customers.coll.update_one(
            {"id": customer_id},
            {
                "$set": {"role": "MEMBER", "updated_at": jsonable_encoder(utcnow())},
                "$unset": {"player_id": "", "staff_id": ""},
            },
        )
        updated = await customers.get(customer_id)
    logger.info("baraya.admin.role admin=%s customer=%s role=%s", user.email, customer_id, payload.role.value)
    return _public_customer(updated or existing)
