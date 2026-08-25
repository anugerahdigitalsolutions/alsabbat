"""Admin user management (Super Admin only)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder

from app.api.crud_factory import Repository
from app.api.deps import require_permission
from app.core.database import Collections
from app.core.errors import ConflictError, NotFoundError, ValidationFailedError
from app.core.rate_limit import write_rate_limit
from app.core.rbac import permissions_for_role
from app.core.security import hash_password
from app.models.auth import AuthContext, UserCreate, UserUpdate
from app.models.base import utcnow

router = APIRouter(tags=["users"])
repo = Repository(Collections.USERS)


def _clean(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("password_hash", None)
    doc["permissions"] = permissions_for_role(doc.get("role", ""))
    return doc


@router.get("", summary="List admin users")
async def list_users(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    _user: AuthContext = Depends(require_permission("user:read")),
):
    items, total = await repo.list({}, limit=limit, skip=skip)
    return {"items": [_clean(i) for i in items], "total": total, "limit": limit, "skip": skip}


@router.post("", status_code=201, summary="Create admin user")
async def create_user(
    payload: UserCreate,
    request: Request,
    _user: AuthContext = Depends(require_permission("user:write")),
):
    write_rate_limit(request)
    email = payload.email.lower().strip()
    if await repo.get_by({"email": email}):
        raise ConflictError("An admin user with this email already exists")
    data = payload.model_dump()
    data.pop("password")
    data["email"] = email
    data["role"] = payload.role.value
    data["password_hash"] = hash_password(payload.password)
    data["last_login_at"] = None
    created = await repo.create(data)
    return _clean(created)


@router.patch("/{user_id}", summary="Update admin user")
async def update_user(
    user_id: str,
    payload: UserUpdate,
    request: Request,
    _user: AuthContext = Depends(require_permission("user:write")),
):
    write_rate_limit(request)
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"]:
        data["email"] = str(data["email"]).lower().strip()
        existing = await repo.get_by({"email": data["email"]})
        if existing and existing["id"] != user_id:
            raise ConflictError("An admin user with this email already exists")
    if "role" in data and data["role"] is not None:
        data["role"] = getattr(data["role"], "value", data["role"])
    updated = await repo.update(user_id, jsonable_encoder(data))
    if not updated:
        raise NotFoundError("Admin user not found")
    return _clean(updated)


@router.post("/{user_id}/reset-password", summary="Reset an admin user password")
async def reset_password(
    user_id: str,
    body: dict,
    request: Request,
    _user: AuthContext = Depends(require_permission("user:write")),
):
    write_rate_limit(request)
    new_password = (body or {}).get("new_password", "")
    if not isinstance(new_password, str) or len(new_password) < 8:
        raise ValidationFailedError("new_password must be at least 8 characters")
    updated = await repo.update(
        user_id,
        {"password_hash": hash_password(new_password), "updated_at": jsonable_encoder(utcnow())},
    )
    if not updated:
        raise NotFoundError("Admin user not found")
    return {"success": True}


@router.delete("/{user_id}", summary="Delete admin user")
async def delete_user(
    user_id: str,
    request: Request,
    user: AuthContext = Depends(require_permission("user:write")),
):
    write_rate_limit(request)
    if user_id == user.user_id:
        raise ValidationFailedError("You cannot delete your own account")
    if not await repo.delete(user_id):
        raise NotFoundError("Admin user not found")
    return {"success": True, "id": user_id}
