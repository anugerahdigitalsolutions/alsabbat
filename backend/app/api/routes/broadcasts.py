"""Endpoint Broadcast Admin Panel.

RBAC memakai permission member existing (`member:read` / `member:write`) karena
broadcast menyasar populasi Baraya — tidak ada permission/role baru dan tidak
ada pelemahan otorisasi.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_permission
from app.core.errors import NotFoundError
from app.models.auth import AuthContext
from app.models.broadcast import BroadcastCreate, BroadcastStatus
from app.services import broadcast as service

router = APIRouter(tags=["broadcasts"])

READ_PERMISSION = "member:read"
WRITE_PERMISSION = "member:write"


@router.get("", summary="Riwayat & jadwal broadcast")
async def list_broadcasts(
    status: Optional[BroadcastStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    _: AuthContext = Depends(require_permission(READ_PERMISSION)),
) -> Dict[str, Any]:
    return await service.list_broadcasts(
        status=status.value if status else None, limit=limit, skip=skip
    )


@router.get("/recipient-counts", summary="Jumlah penerima per kelompok")
async def recipient_counts(
    _: AuthContext = Depends(require_permission(READ_PERMISSION)),
) -> Dict[str, int]:
    return await service.recipient_counts()


@router.post("", status_code=201, summary="Buat broadcast (kirim sekarang atau terjadwal)")
async def create_broadcast(
    payload: BroadcastCreate,
    user: AuthContext = Depends(require_permission(WRITE_PERMISSION)),
) -> Dict[str, Any]:
    return await service.create_broadcast(payload, created_by=user.email)


@router.post("/process-due", summary="Proses broadcast terjadwal yang sudah jatuh tempo")
async def process_due(
    _: AuthContext = Depends(require_permission(WRITE_PERMISSION)),
) -> Dict[str, Any]:
    """Idempoten: broadcast yang sudah terkirim tidak akan dikirim ulang."""
    return await service.process_due_broadcasts()


@router.get("/{broadcast_id}", summary="Detail satu broadcast")
async def get_broadcast(
    broadcast_id: str,
    _: AuthContext = Depends(require_permission(READ_PERMISSION)),
) -> Dict[str, Any]:
    doc = await service.repo.get(broadcast_id)
    if not doc:
        raise NotFoundError("Broadcast tidak ditemukan.")
    return doc
