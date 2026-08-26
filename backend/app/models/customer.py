"""Fase 13 — Baraya ALSABBAT (public customer) models. Additive, separate from admin users."""
from __future__ import annotations

import re
from enum import Enum
from typing import Optional

from pydantic import EmailStr, Field, field_validator

from app.models.base import AppBaseModel, DBModel

PASSWORD_RULE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,128}$")


class CustomerStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


def _validate_password(value: str) -> str:
    if not PASSWORD_RULE.match(value or ""):
        raise ValueError("Kata sandi minimal 8 karakter dan memuat huruf serta angka.")
    return value


class CustomerRegisterRequest(AppBaseModel):
    full_name: str = Field(min_length=3, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=25)
    password: str = Field(min_length=8, max_length=128)
    password_confirmation: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        cleaned = re.sub(r"[^0-9+]", "", value or "")
        if len(re.sub(r"\D", "", cleaned)) < 8:
            raise ValueError("Nomor WhatsApp tidak valid.")
        return cleaned

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("password_confirmation")
    @classmethod
    def _match(cls, value: str, info):
        if value != info.data.get("password"):
            raise ValueError("Konfirmasi kata sandi tidak sama.")
        return value


class CustomerLoginRequest(AppBaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class CustomerProfileUpdate(AppBaseModel):
    full_name: Optional[str] = Field(default=None, min_length=3, max_length=120)
    phone: Optional[str] = Field(default=None, min_length=8, max_length=25)
    photo_url: Optional[str] = Field(default=None, max_length=800)

    @field_validator("photo_url")
    @classmethod
    def _photo(cls, value):
        if value in (None, ""):
            return ""
        url = str(value)
        if not url.startswith(("https://", "/api/media/")):
            raise ValueError("Tautan foto harus https:// atau berkas Media ALSABBAT.")
        path = url.split("?")[0].split("#")[0].lower()
        if path.endswith((".svg", ".svgz", ".html", ".htm", ".xml", ".js")):
            raise ValueError("Format foto tidak diizinkan. Gunakan JPG, PNG, atau WEBP.")
        return url


class CustomerPasswordChange(AppBaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _password(cls, value: str) -> str:
        return _validate_password(value)


class CustomerForgotPasswordRequest(AppBaseModel):
    email: EmailStr


class CustomerResetPasswordRequest(AppBaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    password_confirmation: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("password_confirmation")
    @classmethod
    def _match(cls, value: str, info):
        if value != info.data.get("password"):
            raise ValueError("Konfirmasi kata sandi tidak sama.")
        return value


class CustomerStatusUpdate(AppBaseModel):
    status: CustomerStatus


class Customer(DBModel):
    email: EmailStr
    full_name: str
    phone: str
    status: CustomerStatus = CustomerStatus.ACTIVE
    last_login_at: Optional[str] = None
    member_number: Optional[str] = None
    member_code: Optional[str] = None
    photo_url: Optional[str] = None
    joined_at: Optional[str] = None


class CustomerAuthContext(AppBaseModel):
    customer_id: str
    email: str
    full_name: str
    jti: str
