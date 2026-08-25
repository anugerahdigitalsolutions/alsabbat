"""Authentication module: login, logout, session management, profile."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder

from app.api.deps import get_current_user, request_ip
from app.core.database import Collections, get_db
from app.core.errors import UnauthorizedError
from app.core.logging_config import get_logger
from app.core.rate_limit import login_rate_limit
from app.core.rbac import (
    ROLE_DESCRIPTIONS,
    ROLE_LABELS,
    ROLE_PERMISSIONS,
    permissions_for_role,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth import (
    AuthContext,
    LoginRequest,
    PasswordChangeRequest,
    TokenResponse,
)
from app.models.base import new_id, utcnow

logger = get_logger(__name__)
router = APIRouter(tags=["auth"])


def _public_user(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    doc["permissions"] = permissions_for_role(doc.get("role", ""))
    return jsonable_encoder(doc)


@router.post("/login", response_model=TokenResponse, summary="Admin login")
async def login(payload: LoginRequest, request: Request):
    login_rate_limit(request)
    db = get_db()
    email = payload.email.lower().strip()
    user = await db[Collections.USERS].find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        logger.warning("Failed login attempt for %s from %s", email, request_ip(request))
        raise UnauthorizedError("Invalid email or password")
    if not user.get("is_active", True):
        raise UnauthorizedError("This account has been deactivated")

    role = user.get("role", "")
    permissions = permissions_for_role(role)
    token, jti, expires_at = create_access_token(user["id"], role, permissions)

    await db[Collections.SESSIONS].insert_one(
        {
            "id": new_id(),
            "jti": jti,
            "user_id": user["id"],
            "ip": request_ip(request),
            "user_agent": request.headers.get("user-agent", "")[:300],
            "revoked": False,
            "expires_at": jsonable_encoder(expires_at),
            "created_at": jsonable_encoder(utcnow()),
        }
    )
    await db[Collections.USERS].update_one(
        {"id": user["id"]}, {"$set": {"last_login_at": jsonable_encoder(utcnow())}}
    )
    user["last_login_at"] = jsonable_encoder(utcnow())
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": jsonable_encoder(expires_at),
        "user": _public_user(user),
    }


@router.post("/logout", summary="Admin logout (revokes current session)")
async def logout(user: AuthContext = Depends(get_current_user)):
    db = get_db()
    await db[Collections.SESSIONS].update_one(
        {"jti": user.jti}, {"$set": {"revoked": True, "revoked_at": jsonable_encoder(utcnow())}}
    )
    return {"success": True, "message": "Signed out successfully"}


@router.get("/me", summary="Current authenticated admin")
async def me(user: AuthContext = Depends(get_current_user)):
    db = get_db()
    doc = await db[Collections.USERS].find_one({"id": user.user_id})
    if not doc:
        raise UnauthorizedError("Account no longer exists")
    return _public_user(doc)


@router.post("/change-password", summary="Change own password")
async def change_password(
    payload: PasswordChangeRequest, user: AuthContext = Depends(get_current_user)
):
    db = get_db()
    doc = await db[Collections.USERS].find_one({"id": user.user_id})
    if not doc or not verify_password(payload.current_password, doc.get("password_hash", "")):
        raise UnauthorizedError("Current password is incorrect")
    await db[Collections.USERS].update_one(
        {"id": user.user_id},
        {
            "$set": {
                "password_hash": hash_password(payload.new_password),
                "updated_at": jsonable_encoder(utcnow()),
            }
        },
    )
    await db[Collections.SESSIONS].update_many(
        {"user_id": user.user_id, "jti": {"$ne": user.jti}}, {"$set": {"revoked": True}}
    )
    return {"success": True, "message": "Password updated"}


@router.get("/roles", summary="Role & permission matrix")
async def roles():
    return {
        "roles": [
            {
                "value": role,
                "label": ROLE_LABELS.get(role, role),
                "description": ROLE_DESCRIPTIONS.get(role, ""),
                "permissions": perms,
            }
            for role, perms in ROLE_PERMISSIONS.items()
        ]
    }
