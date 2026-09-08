"""Broadcast notifikasi Admin Panel — model minimal (additive).

Satu koleksi baru `broadcasts` hanya untuk JADWAL & RIWAYAT broadcast.
Pengiriman tetap memakai pusat notifikasi existing (`notification_center`
→ koleksi `notifications`), jadi tidak ada sistem notifikasi paralel.

Kelompok penerima memakai field peran existing pada koleksi `customers`
(`role` tunggal + `roles` multi-profil):
    ALL_MEMBERS       → seluruh akun Baraya aktif (Member, Pemain, Staff)
    MEMBERS_ONLY      → akun yang masih Member saja (belum Pemain/Staff)
    PLAYERS_ONLY      → akun dengan peran PEMAIN
    PLAYERS_AND_STAFF → akun dengan peran PEMAIN dan/atau STAFF
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import Field, model_validator

from app.models.base import AppBaseModel, DBModel, utcnow


class BroadcastGroup(str, Enum):
    ALL_MEMBERS = "ALL_MEMBERS"
    MEMBERS_ONLY = "MEMBERS_ONLY"
    PLAYERS_ONLY = "PLAYERS_ONLY"
    PLAYERS_AND_STAFF = "PLAYERS_AND_STAFF"


class BroadcastDelivery(str, Enum):
    SEND_NOW = "SEND_NOW"
    SCHEDULED = "SCHEDULED"


class BroadcastStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    SENDING = "SENDING"
    SENT = "SENT"
    FAILED = "FAILED"


GROUP_LABELS = {
    BroadcastGroup.ALL_MEMBERS.value: "Semua Member",
    BroadcastGroup.MEMBERS_ONLY.value: "Member Saja",
    BroadcastGroup.PLAYERS_ONLY.value: "Pemain Saja",
    BroadcastGroup.PLAYERS_AND_STAFF.value: "Pemain & Staff",
}


def to_utc(value: datetime) -> datetime:
    """Normalisasi ke UTC tanpa mikrodetik (konsisten dengan penyimpanan ISO)."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).replace(microsecond=0)


class BroadcastCreate(AppBaseModel):
    title: str = Field(min_length=3, max_length=140)
    message: str = Field(min_length=3, max_length=2000)
    recipient_group: BroadcastGroup
    delivery_type: BroadcastDelivery
    scheduled_at: Optional[datetime] = None

    @model_validator(mode="after")
    def _check_schedule(self):
        if self.delivery_type == BroadcastDelivery.SCHEDULED:
            if self.scheduled_at is None:
                raise ValueError("Tanggal & waktu jadwal wajib diisi untuk broadcast terjadwal.")
            target = to_utc(self.scheduled_at)
            if target <= utcnow():
                raise ValueError("Waktu jadwal harus di masa depan.")
            object.__setattr__(self, "scheduled_at", target)
        else:
            object.__setattr__(self, "scheduled_at", None)
        return self

    def resolved_scheduled_at(self) -> datetime:
        """SEND_NOW diperlakukan sebagai jadwal "sekarang" agar alur pengiriman,
        klaim atomik, dan pencegahan duplikasi memakai satu jalur kode saja."""
        if self.delivery_type == BroadcastDelivery.SCHEDULED and self.scheduled_at:
            return to_utc(self.scheduled_at)
        return utcnow().replace(microsecond=0)


class Broadcast(DBModel):
    title: str
    message: str
    recipient_group: str
    delivery_type: str
    scheduled_at: Optional[str] = None
    status: str = BroadcastStatus.SCHEDULED.value
    created_by: Optional[str] = None
    sent_at: Optional[str] = None
    claimed_at: Optional[str] = None
    recipient_count: Optional[int] = None
    notification_count: Optional[int] = None
    error_message: Optional[str] = None
