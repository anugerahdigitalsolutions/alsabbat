"""Password hashing, JWT issuing/verification and session helpers."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt

from app.core.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(
    subject: str,
    role: str,
    permissions: list[str],
    expires_minutes: Optional[int] = None,
) -> tuple[str, str, datetime]:
    """Return (token, jti, expires_at)."""
    jti = uuid.uuid4().hex
    expires_at = utcnow() + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "perms": permissions,
        "jti": jti,
        "iat": int(utcnow().timestamp()),
        "exp": int(expires_at.timestamp()),
        "iss": "alsabbat-api",
    }
    token = jwt.encode(payload, settings.resolved_jwt_secret(), algorithm=settings.JWT_ALGORITHM)
    return token, jti, expires_at


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(
        token,
        settings.resolved_jwt_secret(),
        algorithms=[settings.JWT_ALGORITHM],
        issuer="alsabbat-api",
    )
