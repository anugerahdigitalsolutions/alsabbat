"""Endpoint integration settings Merchandise (Fase 1).

RBAC memakai permission existing `store:manage` (SUPER_ADMIN, STORE_MANAGER,
FINANCE_ADMIN) — tidak ada role/permission baru.

Tidak ada endpoint publik di sini: kredensial hanya bisa dibaca (dalam bentuk
ter-mask) dan ditulis oleh admin yang berwenang.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request

from app.api.deps import require_permission
from app.core.rate_limit import write_rate_limit
from app.models.auth import AuthContext
from app.models.integration_settings import IntegrationSettingsSave
from app.services import integration_settings as service

router = APIRouter(tags=["integration-settings"])

MANAGE_PERMISSION = "store:manage"


@router.get("", summary="Integration settings (rahasia selalu ter-mask)")
async def get_integration_settings(
    _: AuthContext = Depends(require_permission(MANAGE_PERMISSION)),
) -> Dict[str, Any]:
    return await service.list_settings()


@router.put("", summary="Simpan integration settings (write-only untuk rahasia)")
async def save_integration_settings(
    payload: IntegrationSettingsSave,
    request: Request,
    user: AuthContext = Depends(require_permission(MANAGE_PERMISSION)),
) -> Dict[str, Any]:
    """Key yang tidak dikirim tidak diubah; string kosong menghapus setting."""
    write_rate_limit(request)
    result = await service.save_settings(payload.values, actor=user.email)
    return {"success": True, **result, **(await service.list_settings())}
