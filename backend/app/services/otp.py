"""Fase 3 — kode OTP sekali pakai untuk verifikasi pendaftaran & reset kata sandi.

Kode hanya disimpan sebagai SHA-256; plaintext hanya ada di email pengguna.
Bila provider email belum dikonfigurasi, endpoint melaporkan `delivered: false`
(tidak pernah mengklaim email terkirim).
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import timedelta
from typing import Any, Dict

from fastapi.encoders import jsonable_encoder

from app.core.config import settings
from app.core.database import Collections, get_db
from app.core.logging_config import get_logger
from app.models.base import new_id, utcnow
from app.services.mailer import send_customer_otp_email

logger = get_logger(__name__)

PURPOSE_REGISTER = "REGISTER"
PURPOSE_RESET = "RESET"


def _digest(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


async def issue_otp(*, email: str, full_name: str, purpose: str) -> Dict[str, Any]:
    """Buat kode baru, kirim email, lalu simpan hash-nya."""
    email = email.lower().strip()
    code = f"{secrets.randbelow(1_000_000):06d}"
    db = get_db()
    # Kode lama untuk tujuan yang sama langsung dianggap kedaluwarsa.
    await db[Collections.CUSTOMER_OTPS].delete_many({"email": email, "purpose": purpose})

    delivered = await send_customer_otp_email(
        email=email,
        full_name=full_name,
        code=code,
        purpose=purpose,
        expires_minutes=settings.OTP_EXPIRE_MINUTES,
    )

    now = utcnow()
    await db[Collections.CUSTOMER_OTPS].insert_one(
        {
            "id": new_id(),
            "email": email,
            "purpose": purpose,
            "code_hash": _digest(code),
            "attempts": 0,
            "used_at": None,
            "delivered": delivered,
            "expires_at": jsonable_encoder(now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)),
            "created_at": jsonable_encoder(now),
        }
    )

    if not delivered and not settings.is_production:
        # Email belum terkonfigurasi: kode ditampilkan HANYA di log server
        # non-produksi supaya pengurus klub tetap bisa menguji alurnya.
        logger.warning(
            "otp.debug_code email=%s purpose=%s code=%s (email provider NOT_CONFIGURED)",
            email,
            purpose,
            code,
        )
    return {"delivered": delivered, "expires_minutes": settings.OTP_EXPIRE_MINUTES}


async def verify_otp(*, email: str, purpose: str, code: str) -> bool:
    """Konsumsi kode: sekali pakai, dibatasi jumlah percobaan."""
    email = email.lower().strip()
    db = get_db()
    now = jsonable_encoder(utcnow())
    row = await db[Collections.CUSTOMER_OTPS].find_one(
        {"email": email, "purpose": purpose, "used_at": None}
    )
    if not row or row["expires_at"] <= now or row.get("attempts", 0) >= settings.OTP_MAX_ATTEMPTS:
        return False
    if not hmac.compare_digest(row["code_hash"], _digest(code)):
        await db[Collections.CUSTOMER_OTPS].update_one({"id": row["id"]}, {"$inc": {"attempts": 1}})
        return False
    await db[Collections.CUSTOMER_OTPS].update_one({"id": row["id"]}, {"$set": {"used_at": now}})
    return True
