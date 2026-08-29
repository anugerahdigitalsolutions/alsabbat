"""Fase 3 — peran anggota (Guest → Member → Pemain → Staf) & pengajuan.

Additive terhadap Fase 13–18: tetap satu koleksi `customers`, satu sesi Baraya.
Guest = belum login (tidak ada dokumen), jadi tidak menjadi nilai enum tersimpan.
"""
from __future__ import annotations

import re
from enum import Enum
from typing import Optional

from pydantic import EmailStr, Field, field_validator

from app.models.base import AppBaseModel, DBModel
from app.models.customer import _validate_password

GALLERY_ROLES = {"PEMAIN", "STAFF"}


class MemberRole(str, Enum):
    MEMBER = "MEMBER"
    PEMAIN = "PEMAIN"
    STAFF = "STAFF"


class ApplicationType(str, Enum):
    PEMAIN = "PEMAIN"
    STAFF = "STAFF"


class ApplicationStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class OtpPurpose(str, Enum):
    REGISTER = "REGISTER"
    RESET = "RESET"


class OtpRequestPayload(AppBaseModel):
    email: EmailStr
    purpose: OtpPurpose = OtpPurpose.REGISTER


class OtpVerifyPayload(AppBaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class OtpResetPasswordPayload(AppBaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
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


class GoogleLoginPayload(AppBaseModel):
    code: str = Field(min_length=10, max_length=2000)
    redirect_uri: str = Field(min_length=8, max_length=500)

    @field_validator("redirect_uri")
    @classmethod
    def _https(cls, value: str) -> str:
        if not value.startswith(("https://", "http://localhost")):
            raise ValueError("redirect_uri tidak valid.")
        return value


class ApplicationCreate(AppBaseModel):
    type: ApplicationType
    full_name: str = Field(min_length=3, max_length=120)
    phone: str = Field(min_length=8, max_length=25)
    position: Optional[str] = Field(default=None, max_length=120)
    birth_date: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=300)
    experience: Optional[str] = Field(default=None, max_length=2000)
    motivation: str = Field(min_length=10, max_length=2000)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        cleaned = re.sub(r"[^0-9+]", "", value or "")
        if len(re.sub(r"\D", "", cleaned)) < 8:
            raise ValueError("Nomor WhatsApp tidak valid.")
        return cleaned


class ApplicationDecision(AppBaseModel):
    decision: ApplicationStatus
    player_id: Optional[str] = Field(default=None, max_length=64)
    staff_id: Optional[str] = Field(default=None, max_length=64)
    note: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("decision")
    @classmethod
    def _decidable(cls, value: ApplicationStatus) -> ApplicationStatus:
        if value == ApplicationStatus.PENDING:
            raise ValueError("Keputusan harus APPROVED atau REJECTED.")
        return value


class RoleUpdate(AppBaseModel):
    role: MemberRole
    player_id: Optional[str] = Field(default=None, max_length=64)
    staff_id: Optional[str] = Field(default=None, max_length=64)


class MemberApplication(DBModel):
    customer_id: str
    type: ApplicationType
    status: ApplicationStatus = ApplicationStatus.PENDING
    full_name: str
    phone: str
    position: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    experience: Optional[str] = None
    motivation: str
    note: Optional[str] = None
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    player_id: Optional[str] = None
    staff_id: Optional[str] = None
