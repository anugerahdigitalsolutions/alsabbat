"""Fase 4B — endpoint notifikasi Admin Panel (icon lonceng).

Akses: setiap akun admin yang login (tanpa permission baru, RBAC tidak diubah).
Notifikasi admin bersifat broadcast; status read disimpan per akun admin.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.core.errors import NotFoundError
from app.models.auth import AuthContext
from app.services import notification_center as center

router = APIRouter(tags=["notifications"])


@router.get("", summary="Daftar notifikasi Admin Panel + jumlah belum dibaca")
async def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    user: AuthContext = Depends(get_current_user),
) -> Dict[str, Any]:
    items, total, unread = await center.list_admin(user.email, limit=limit)
    return {"items": items, "total": total, "unread": unread}


@router.get("/unread-count", summary="Jumlah notifikasi admin yang belum dibaca (ringan)")
async def unread_count(user: AuthContext = Depends(get_current_user)) -> Dict[str, Any]:
    """Endpoint hemat untuk polling badge; tidak menarik daftar notifikasi."""
    return {"unread": await center.count_admin_unread(user.email)}


@router.patch("/{notification_id}/read", summary="Tandai satu notifikasi sudah dibaca")
async def read_notification(
    notification_id: str, user: AuthContext = Depends(get_current_user)
) -> Dict[str, Any]:
    updated = await center.mark_admin_read(notification_id, user.email)
    if not updated:
        raise NotFoundError("Notifikasi tidak ditemukan.")
    _, _, unread = await center.list_admin(user.email, limit=1)
    return {"success": True, "notification": updated, "unread": unread}


@router.post("/read-all", summary="Tandai semua notifikasi admin sudah dibaca")
async def read_all_notifications(user: AuthContext = Depends(get_current_user)) -> Dict[str, Any]:
    updated = await center.mark_admin_read_all(user.email)
    return {"success": True, "updated": updated, "unread": 0}
