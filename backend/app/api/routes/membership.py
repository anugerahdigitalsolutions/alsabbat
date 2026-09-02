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
    ApplicationDataUpdate,
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
from app.models.staff_structure import role_for_position
from app.services.mailer import mail_status
from app.services import notification_center as center
from app.services.notifications import firebase_status, notify_admin_review
from app.services.membership import ensure_member_identity
from app.services.otp import PURPOSE_REGISTER, PURPOSE_RESET, issue_otp, verify_otp

logger = get_logger(__name__)
router = APIRouter(tags=["baraya-membership"])

customers = Repository(Collections.CUSTOMERS)
applications = Repository(Collections.MEMBER_APPLICATIONS)
players = Repository(Collections.PLAYERS)
staff = Repository(Collections.STAFF)
teams = Repository(Collections.TEAMS)

member_read = Depends(require_permission("member:read"))
member_write = Depends(require_permission("member:write"))

GENERIC_OTP_RESPONSE = "Jika email terdaftar, kode verifikasi telah dikirim."
INVALID_OTP = "Kode verifikasi salah atau sudah kedaluwarsa."

# Fase 3.1 — pendaftaran yang belum terverifikasi berstatus PENDING dan HARUS
# tetap bisa menyelesaikan alur OTP (request/verify/reset).
STATUS_PENDING = "PENDING"
ALLOWED_OTP_STATUSES = {"ACTIVE", STATUS_PENDING}


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
    # Record PENDING (belum lolos OTP) tetap boleh menerima kode: inilah jalur
    # resend untuk menyelesaikan pendaftaran.
    if customer and customer.get("status") in ALLOWED_OTP_STATUSES:
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
    if not customer or customer.get("status") not in ALLOWED_OTP_STATUSES:
        raise UnauthorizedError(INVALID_OTP)
    # OTP terbukti benar → akun resmi diaktifkan di sini (bukan saat register).
    await customers.coll.update_one(
        {"id": customer["id"]},
        {
            "$set": {
                "email_verified": True,
                "status": "ACTIVE",
                "updated_at": jsonable_encoder(utcnow()),
            }
        },
    )
    # Nomor & kode member baru dialokasikan setelah verifikasi (idempoten).
    fresh = await ensure_member_identity(await customers.get(customer["id"]))
    logger.info("baraya.otp.verified customer=%s member=%s", customer["id"], fresh.get("member_number"))
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
    if not customer or customer.get("status") not in ALLOWED_OTP_STATUSES:
        raise UnauthorizedError(INVALID_OTP)
    now = jsonable_encoder(utcnow())
    await customers.coll.update_one(
        {"id": customer["id"]},
        {
            "$set": {
                "password_hash": hash_password(payload.password),
                "email_verified": True,
                # Kepemilikan email sudah terbukti lewat OTP: record PENDING
                # dipromosikan menjadi akun resmi agar tidak berhenti separuh jalan.
                "status": "ACTIVE",
                "updated_at": now,
            }
        },
    )
    await ensure_member_identity(await customers.get(customer["id"]))
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


def _roles_of(customer: Optional[Dict[str, Any]]) -> list:
    """Satu akun bisa punya beberapa profil (PEMAIN + STAFF). Akun lama tanpa
    field `roles` memakai `role` tunggal → backward-compatible."""
    if not customer:
        return []
    roles = customer.get("roles")
    if isinstance(roles, list) and roles:
        return roles
    return [customer.get("role") or "MEMBER"]


@router.get("/access", summary="Hak akses konten untuk akun yang sedang login")
async def my_access(
    auth: Optional[CustomerAuthContext] = Depends(optional_customer),
) -> Dict[str, Any]:
    doc = await customers.get(auth.customer_id) if auth else None
    role = _role_of(doc)
    roles = _roles_of(doc)
    allowed = bool(set(roles) & GALLERY_ROLES)
    return {
        "role": role,
        "roles": roles,
        "can_view_gallery": allowed,
        "can_view_spotlight": allowed,
        "can_apply_player": roles == ["MEMBER"],
        # Multi-entry: Pemain boleh mengajukan Staf berkali-kali (bagian/jabatan berbeda).
        "can_apply_staff": "PEMAIN" in roles,
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
    roles = _roles_of(customer)
    if payload.type.value == "PEMAIN":
        # Fase 4A — pengajuan Pemain hanya untuk MEMBER (Guest sudah tertolak auth).
        if roles != ["MEMBER"]:
            raise ForbiddenError(
                "Pengajuan Pemain hanya untuk akun Member. Akun Anda sudah memiliki profil klub."
            )
    else:
        # Pengajuan Staf hanya untuk akun yang sudah menjadi PEMAIN.
        if "PEMAIN" not in roles:
            raise ForbiddenError(
                "Pengajuan Staf hanya untuk akun Pemain. Ajukan diri sebagai Pemain terlebih dahulu."
            )
    if payload.type.value == "STAFF":
        # Multi-entry: satu akun boleh punya banyak pengajuan/entry Staf.
        # Yang ditolak hanya duplikat persis (bagian + jabatan sama) yang masih PENDING.
        staff_payload = payload.staff_data
        duplicate = await applications.get_by(
            {
                "customer_id": auth.customer_id,
                "type": "STAFF",
                "status": "PENDING",
                "staff_data.department": staff_payload.department if staff_payload else None,
                "staff_data.position_title": staff_payload.position_title if staff_payload else None,
            }
        )
        if duplicate:
            raise ConflictError(
                "Pengajuan Staf untuk bagian & jabatan ini masih diproses pengurus klub."
            )
    else:
        pending = await applications.get_by(
            {"customer_id": auth.customer_id, "type": payload.type.value, "status": "PENDING"}
        )
        if pending:
            raise ConflictError("Pengajuan Anda masih diproses pengurus klub.")

    data = payload.model_dump()
    player_data = data.pop("player_data", None)
    staff_data = data.pop("staff_data", None)
    if staff_data:
        # Foto Staf TERPISAH dari foto Pemain (tidak saling menimpa).
        staff_data["role"] = (
            staff_data["role"].value if hasattr(staff_data["role"], "value") else staff_data["role"]
        )
    if player_data:
        # Foto memakai sistem media existing: foto profil Baraya milik sendiri.
        player_data["photo"] = player_data.get("photo") or customer.get("photo_url") or None
        player_data["position"] = (
            player_data["position"].value
            if hasattr(player_data["position"], "value")
            else player_data["position"]
        )

    created = await applications.create(
        {
            **data,
            "type": payload.type.value,
            "customer_id": auth.customer_id,
            "email": customer["email"],
            "status": "PENDING",
            "player_data": player_data,
            "staff_data": staff_data,
            "note": None,
            "decided_by": None,
            "decided_at": None,
            "player_id": None,
            "staff_id": None,
        }
    )
    notification = notify_admin_review(
        title=f"Pengajuan {payload.type.value.title()} baru",
        body=f"{payload.full_name} mengajukan diri sebagai {payload.type.value}. Perlu direview.",
        data={"kind": "member_application", "application_id": created["id"], "type": payload.type.value},
    )
    # Riwayat notifikasi Admin Panel (icon lonceng) — tersimpan permanen,
    # tidak bergantung pada konfigurasi push Firebase.
    await center.create_notification(
        audience=center.AUDIENCE_ADMIN,
        type="APPLICATION_SUBMITTED",
        title=f"Pengajuan {'Pemain' if payload.type.value == 'PEMAIN' else 'Staff'} Baru",
        message=f"{payload.full_name} mengajukan diri sebagai "
        f"{'Pemain' if payload.type.value == 'PEMAIN' else 'Staff'}. Perlu ditinjau.",
        # Deep-link: Admin Panel membuka dialog review pengajuan ini langsung.
        link=f"/admin/baraya?application={created['id']}",
        reference_type="member_application",
        reference_id=created["id"],
    )
    logger.info(
        "baraya.application.created customer=%s type=%s notified=%s",
        auth.customer_id,
        payload.type.value,
        notification["provider"],
    )
    return {**_public_application(created), "notification": notification}


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
    return {
        "email": mail_status(),
        "google": google_auth.google_status(),
        "firebase": firebase_status(),
    }


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
    """Tautan ke record existing bersifat OPSIONAL (Pemain & Staf).

    Bila kosong, record baru dibuat otomatis dari data pengajuan saat disetujui.
    """
    if app_type == ApplicationType.PEMAIN.value:
        if not player_id:
            # Pengajuan baru: Pemain baru dibuat dari data pengajuan saat approve.
            return {"player_id": None, "staff_id": None}
        if not await players.get(player_id):
            raise NotFoundError("Record pemain tidak ditemukan.")
        return {"player_id": player_id, "staff_id": None}
    if not staff_id:
        # Multi-entry (keputusan produk): Staff Entry baru dibuat otomatis dari
        # data pengajuan saat disetujui, jadi tautan manual bersifat opsional.
        return {"player_id": None, "staff_id": None}
    if not await staff.get(staff_id):
        raise NotFoundError("Record staf tidak ditemukan.")
    return {"player_id": None, "staff_id": staff_id}


async def _resolve_team_id(customer_doc: Optional[Dict[str, Any]]) -> str:
    """Tim untuk Staff Entry baru: ikut tim Pemain, fallback tim pertama klub."""
    player_id = (customer_doc or {}).get("player_id")
    if player_id:
        player = await players.get(player_id)
        if player and player.get("team_id"):
            return player["team_id"]
    items, _ = await teams.list({}, limit=1, sort=(("created_at", 1),))
    if items:
        return items[0]["id"]
    raise ValidationFailedError("Belum ada data Tim. Tambahkan Tim terlebih dahulu.")


async def _create_staff_entry(
    customer_doc: Optional[Dict[str, Any]], application: Dict[str, Any]
) -> str:
    """Buat Staff Entry baru dari data pengajuan (tanpa membuat akun/pemain baru)."""
    data = application.get("staff_data") or {}
    position = data.get("position_title")
    social = {"instagram": data.get("instagram")} if data.get("instagram") else {}
    created = await staff.create(
        {
            "team_id": await _resolve_team_id(customer_doc),
            "name": data.get("name") or application.get("full_name"),
            "photo": data.get("photo") or None,
            "role": data.get("role") or role_for_position(position) or "OTHER",
            # `role_label` diisi Jabatan agar tampilan lama tetap informatif.
            "role_label": data.get("role_label") or position or None,
            "department": data.get("department") or None,
            "position_title": position or None,
            "bio": data.get("bio") or None,
            "social_media": social,
            "status": "ACTIVE",
            "gallery_images": [],
            "player_id": (customer_doc or {}).get("player_id"),
            "customer_id": (customer_doc or {}).get("id"),
        }
    )
    return created["id"]


async def _create_player_entry(
    customer_doc: Optional[Dict[str, Any]], application: Dict[str, Any]
) -> str:
    """Buat record Pemain BARU dari data pengajuan (tanpa perlu pemain existing)."""
    data = application.get("player_data") or {}
    social = {"instagram": data.get("instagram")} if data.get("instagram") else {}
    created = await players.create(
        {
            "team_id": await _resolve_team_id(customer_doc),
            "full_name": data.get("full_name") or application.get("full_name"),
            "display_name": data.get("display_name") or None,
            # Foto pengajuan langsung menjadi foto Pemain (field `photo`, sama
            # dengan form "Tambah Pemain" di Admin Panel).
            "photo": data.get("photo") or None,
            "jersey_number": data.get("jersey_number"),
            "position": data.get("position") or "MIDFIELDER",
            "date_of_birth": data.get("date_of_birth") or None,
            "nationality": data.get("nationality") or None,
            "height_cm": data.get("height_cm"),
            "weight_kg": data.get("weight_kg"),
            "bio": data.get("bio") or None,
            "status": "ACTIVE",
            "goals": 0,
            "assists": 0,
            "appearances": 0,
            "yellow_cards": 0,
            "red_cards": 0,
            "historical_goals": 0,
            "historical_assists": 0,
            "social_media": social,
            "gallery_images": [],
        }
    )
    return created["id"]


@router.patch("/admin/applications/{application_id}/data", summary="Admin: lengkapi/koreksi data pengajuan")
async def admin_update_application_data(
    application_id: str, payload: ApplicationDataUpdate, user: AuthContext = member_write
) -> Dict[str, Any]:
    existing = await applications.get(application_id)
    if not existing:
        raise NotFoundError("Pengajuan tidak ditemukan.")
    if existing.get("status") != "PENDING":
        raise ConflictError("Hanya pengajuan berstatus PENDING yang dapat diedit.")

    changes = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "player_data" in changes:
        merged = {**(existing.get("player_data") or {}), **changes["player_data"]}
        position = merged.get("position")
        merged["position"] = position.value if hasattr(position, "value") else position
        changes["player_data"] = merged
    if "staff_data" in changes:
        merged_staff = {**(existing.get("staff_data") or {}), **changes["staff_data"]}
        staff_role = merged_staff.get("role")
        merged_staff["role"] = staff_role.value if hasattr(staff_role, "value") else staff_role
        changes["staff_data"] = merged_staff
    updated = await applications.update(application_id, changes)
    logger.info("baraya.application.edited admin=%s application=%s", user.email, application_id)
    return _public_application(updated or existing)


async def _apply_player_data(player_id: str, player_data: Optional[Dict[str, Any]]) -> None:
    """Tulis data pengajuan yang disetujui ke record Pemain existing (tanpa duplikat)."""
    if not player_data:
        return
    changes: Dict[str, Any] = {}
    for key in (
        "full_name",
        "display_name",
        "jersey_number",
        "position",
        "date_of_birth",
        "nationality",
        "height_cm",
        "weight_kg",
        "bio",
        "photo",
    ):
        value = player_data.get(key)
        if value not in (None, ""):
            changes[key] = value.value if hasattr(value, "value") else value
    instagram = player_data.get("instagram")
    if instagram:
        player = await players.get(player_id)
        social = {**((player or {}).get("social_media") or {}), "instagram": instagram}
        changes["social_media"] = social
    if changes:
        await players.update(player_id, changes)


async def _apply_staff_data(staff_id: str, staff_data: Optional[Dict[str, Any]]) -> None:
    """Tulis data pengajuan Staf yang disetujui ke record Staf existing (tanpa duplikat)."""
    if not staff_data:
        return
    changes: Dict[str, Any] = {}
    for key in ("name", "role", "role_label", "bio", "photo", "department", "position_title"):
        value = staff_data.get(key)
        if value not in (None, ""):
            changes[key] = value.value if hasattr(value, "value") else value
    instagram = staff_data.get("instagram")
    if instagram:
        record = await staff.get(staff_id)
        changes["social_media"] = {
            **((record or {}).get("social_media") or {}),
            "instagram": instagram,
        }
    if changes:
        await staff.update(staff_id, changes)


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
        customer_doc = await customers.get(existing["customer_id"])
        if existing["type"] == ApplicationType.STAFF.value and not link.get("staff_id"):
            # Staff Entry baru per pengajuan: bagian, jabatan, foto & status sendiri.
            link["staff_id"] = await _create_staff_entry(customer_doc, existing)
        if existing["type"] == ApplicationType.PEMAIN.value and not link.get("player_id"):
            # Pengajuan Pemain baru: record Pemain dibuat dari data pengajuan
            # (termasuk foto), tanpa perlu menautkan pemain existing.
            link["player_id"] = await _create_player_entry(customer_doc, existing)
        changes.update(link)
        roles = [r for r in _roles_of(customer_doc) if r != "MEMBER"]
        if existing["type"] not in roles:
            roles.append(existing["type"])
        # Satu akun dapat memiliki profil PEMAIN dan STAFF sekaligus:
        # `role` menyimpan status tertinggi, `roles` menyimpan semua profil.
        primary = "STAFF" if "STAFF" in roles else "PEMAIN" if "PEMAIN" in roles else "MEMBER"
        if link.get("player_id"):
            # Data yang disetujui menjadi data pemain yang dipakai website.
            await _apply_player_data(link["player_id"], existing.get("player_data"))
        if link.get("staff_id"):
            await _apply_staff_data(link["staff_id"], existing.get("staff_data"))
        await customers.update(
            existing["customer_id"],
            {
                "role": primary,
                "roles": roles,
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

    # ---- Notifikasi persisten (icon lonceng) untuk pemohon & admin ----
    is_player = existing["type"] == ApplicationType.PEMAIN.value
    role_label = "Pemain" if is_player else "Staff"
    role_word = "pemain" if is_player else "staff"
    if payload.decision == ApplicationStatus.APPROVED:
        user_title = f"Pengajuan {role_label} Disetujui"
        user_message = f"Selamat, pengajuan Anda sebagai {role_word} telah disetujui."
        notif_type = "APPLICATION_APPROVED"
    else:
        user_title = f"Pengajuan {role_label} Ditolak"
        user_message = (
            f"Pengajuan Anda sebagai {role_word} belum dapat disetujui."
            + (f" Catatan pengurus: {payload.note}" if payload.note else "")
        )
        notif_type = "APPLICATION_REJECTED"
    await center.create_notification(
        audience=center.AUDIENCE_CUSTOMER,
        recipient_id=existing["customer_id"],
        type=notif_type,
        title=user_title,
        message=user_message,
        link="/akun",
        reference_type="member_application",
        reference_id=application_id,
    )
    await center.create_notification(
        audience=center.AUDIENCE_ADMIN,
        type=notif_type,
        title=f"{user_title} — {existing.get('full_name', '')}".strip(),
        message=f"Pengajuan {role_label} {existing.get('full_name', '')} "
        f"{'disetujui' if payload.decision == ApplicationStatus.APPROVED else 'ditolak'} oleh {user.email}.",
        link="/admin/baraya",
        reference_type="member_application",
        reference_id=application_id,
    )

    return {
        **_public_application(updated or existing),
        "customer": _public_customer(customer) if customer else None,
    }


# ------------------------------------------------- notifikasi akun Baraya
@router.get("/notifications", summary="Daftar notifikasi akun Baraya + jumlah belum dibaca")
async def my_notifications(
    limit: int = Query(30, ge=1, le=100),
    auth: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    items, total, unread = await center.list_customer(auth.customer_id, limit=limit)
    return {"items": items, "total": total, "unread": unread}


@router.get("/notifications/unread-count", summary="Jumlah notifikasi Baraya belum dibaca (ringan)")
async def my_notifications_unread_count(
    auth: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    """Endpoint hemat untuk polling badge akun Baraya."""
    return {"unread": await center.count_customer_unread(auth.customer_id)}


@router.patch("/notifications/{notification_id}/read", summary="Tandai notifikasi sudah dibaca")
async def read_my_notification(
    notification_id: str, auth: CustomerAuthContext = Depends(get_current_customer)
) -> Dict[str, Any]:
    updated = await center.mark_customer_read(notification_id, auth.customer_id)
    if not updated:
        raise NotFoundError("Notifikasi tidak ditemukan.")
    _, _, unread = await center.list_customer(auth.customer_id, limit=1)
    return {"success": True, "notification": updated, "unread": unread}


@router.post("/notifications/read-all", summary="Tandai semua notifikasi sudah dibaca")
async def read_all_my_notifications(
    auth: CustomerAuthContext = Depends(get_current_customer),
) -> Dict[str, Any]:
    updated = await center.mark_customer_read_all(auth.customer_id)
    return {"success": True, "updated": updated, "unread": 0}


@router.patch("/admin/{customer_id}/role", summary="Admin: ubah peran akun Baraya")
async def admin_set_role(
    customer_id: str, payload: RoleUpdate, user: AuthContext = member_write
) -> Dict[str, Any]:
    existing = await customers.get(customer_id)
    if not existing:
        raise NotFoundError("Akun Baraya tidak ditemukan.")
    changes: Dict[str, Any] = {"role": payload.role.value, "roles": [payload.role.value]}
    if payload.role.value == "PEMAIN":
        # Ubah peran manual (bukan alur pengajuan) tetap wajib menautkan record Pemain.
        if not payload.player_id:
            raise ValidationFailedError(
                "Pilih record Pemain yang sudah ada untuk ditautkan pada akun ini."
            )
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
                "$set": {
                    "role": "MEMBER",
                    "roles": ["MEMBER"],
                    "updated_at": jsonable_encoder(utcnow()),
                },
                "$unset": {"player_id": "", "staff_id": ""},
            },
        )
        updated = await customers.get(customer_id)
    logger.info("baraya.admin.role admin=%s customer=%s role=%s", user.email, customer_id, payload.role.value)
    return _public_customer(updated or existing)
