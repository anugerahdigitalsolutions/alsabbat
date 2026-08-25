"""Shared FastAPI dependencies: authentication + permission enforcement."""
from __future__ import annotations

from typing import Callable, Optional

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import Collections, get_db
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.rbac import has_permission, permissions_for_role
from app.core.security import decode_token
from app.models.auth import AuthContext

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthContext:
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Authentication token is missing")
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Session expired, please sign in again")
    except jwt.PyJWTError:
        raise UnauthorizedError("Invalid authentication token")

    db = get_db()
    jti = payload.get("jti", "")
    session = await db[Collections.SESSIONS].find_one({"jti": jti})
    if not session or session.get("revoked"):
        raise UnauthorizedError("Session is no longer valid")

    user = await db[Collections.USERS].find_one({"id": payload.get("sub")})
    if not user or not user.get("is_active", True):
        raise UnauthorizedError("Account is inactive or no longer exists")

    return AuthContext(
        user_id=user["id"],
        email=user["email"],
        name=user.get("name", ""),
        role=user.get("role", ""),
        permissions=permissions_for_role(user.get("role", "")),
        jti=jti,
    )


def require_permission(*required: str) -> Callable:
    """Backend-enforced authorization (never only hidden in the UI)."""

    async def _dependency(user: AuthContext = Depends(get_current_user)) -> AuthContext:
        for permission in required:
            if not has_permission(user.permissions, permission):
                raise ForbiddenError(
                    f"Role '{user.role}' is not allowed to perform '{permission}'"
                )
        return user

    return _dependency


async def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[AuthContext]:
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None


def request_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
