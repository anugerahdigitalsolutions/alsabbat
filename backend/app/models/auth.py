"""Admin user / auth models."""
from __future__ import annotations

from typing import List, Optional

from pydantic import EmailStr, Field

from app.core.rbac import Role
from app.models.base import AppBaseModel, DBModel, make_update_model


class UserBase(AppBaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=120)
    role: Role = Role.CONTENT_ADMIN
    is_active: bool = True
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


UserUpdate = make_update_model("UserUpdate", UserBase)


class User(UserBase, DBModel):
    last_login_at: Optional[str] = None


class UserPublic(User):
    permissions: List[str] = Field(default_factory=list)


class LoginRequest(AppBaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PasswordChangeRequest(AppBaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(AppBaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    user: UserPublic


class AuthContext(AppBaseModel):
    user_id: str
    email: str
    name: str
    role: str
    permissions: List[str]
    jti: str
