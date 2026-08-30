"""Fase 3 — peran anggota (Guest → Member → Pemain → Staf) & pengajuan.

Additive terhadap Fase 13–18: tetap satu koleksi `customers`, satu sesi Baraya.
Guest = belum login (tidak ada dokumen), jadi tidak menjadi nilai enum tersimpan.
"""
from __future__ import annotations

import re
from enum import Enum
from typing import Optional

from pydantic import EmailStr, Field, field_validator, model_validator

from app.models.base import AppBaseModel, DBModel
from app.models.customer import _validate_password
from app.models.enums import PlayerPosition, StaffRole
from app.models.staff_structure import normalise_staff_structure

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


class PlayerApplicationData(AppBaseModel):
    """Fase 4A — data pemain memakai field model Pemain existing (PlayerBase).

    Tidak membuat struktur pemain kedua: saat disetujui, nilai di sini
    ditulis ke record `players` yang dipilih Admin.
    """

    full_name: str = Field(min_length=2, max_length=160)
    display_name: Optional[str] = Field(default=None, max_length=80)
    jersey_number: Optional[int] = Field(default=None, ge=0, le=99)
    position: PlayerPosition = PlayerPosition.MIDFIELDER
    date_of_birth: Optional[str] = Field(default=None, max_length=20)
    nationality: Optional[str] = Field(default=None, max_length=80)
    height_cm: Optional[int] = Field(default=None, ge=100, le=250)
    weight_kg: Optional[int] = Field(default=None, ge=30, le=180)
    bio: Optional[str] = Field(default=None, max_length=4000)
    photo: Optional[str] = Field(default=None, max_length=800)
    instagram: Optional[str] = Field(default=None, max_length=200)


class StaffApplicationData(AppBaseModel):
    """Field mengikuti form Staf di Admin Panel (StaffBase) — terpisah dari data Pemain."""

    name: str = Field(min_length=2, max_length=160)
    role: StaffRole = StaffRole.TEAM_MANAGER
    role_label: Optional[str] = Field(default=None, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=4000)
    photo: Optional[str] = Field(default=None, max_length=800)
    instagram: Optional[str] = Field(default=None, max_length=200)
    # Multi-entry: setiap pengajuan Staf punya Bagian, Jabatan dan Foto sendiri.
    department: Optional[str] = Field(default=None, max_length=120)
    position_title: Optional[str] = Field(default=None, max_length=120)

    @model_validator(mode="before")
    @classmethod
    def _structure(cls, data):
        return normalise_staff_structure(data)


class ApplicationCreate(AppBaseModel):
    type: ApplicationType
    full_name: str = Field(min_length=3, max_length=120)
    phone: str = Field(min_length=8, max_length=25)
    position: Optional[str] = Field(default=None, max_length=120)
    birth_date: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=300)
    experience: Optional[str] = Field(default=None, max_length=2000)
    motivation: str = Field(min_length=10, max_length=2000)
    # Wajib untuk pengajuan PEMAIN (form mengikuti form Pemain di Admin Panel).
    player_data: Optional[PlayerApplicationData] = None
    # Wajib untuk pengajuan STAFF (form mengikuti form Staf di Admin Panel).
    staff_data: Optional[StaffApplicationData] = None

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        cleaned = re.sub(r"[^0-9+]", "", value or "")
        if len(re.sub(r"\D", "", cleaned)) < 8:
            raise ValueError("Nomor WhatsApp tidak valid.")
        return cleaned

    @model_validator(mode="after")
    def _require_profile_data(self):
        if self.type == ApplicationType.PEMAIN and self.player_data is None:
            raise ValueError("Data pemain wajib diisi untuk pengajuan Pemain.")
        if self.type == ApplicationType.STAFF and self.staff_data is None:
            raise ValueError("Data staf wajib diisi untuk pengajuan Staf.")
        return self


class ApplicationDataUpdate(AppBaseModel):
    """Fase 4A — Admin melengkapi/mengoreksi pengajuan sebelum approval."""

    phone: Optional[str] = Field(default=None, max_length=25)
    position: Optional[str] = Field(default=None, max_length=120)
    birth_date: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=300)
    experience: Optional[str] = Field(default=None, max_length=2000)
    motivation: Optional[str] = Field(default=None, max_length=2000)
    player_data: Optional[PlayerApplicationData] = None
    staff_data: Optional[StaffApplicationData] = None


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
    staff_data: Optional[StaffApplicationData] = None
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
    player_data: Optional[PlayerApplicationData] = None
