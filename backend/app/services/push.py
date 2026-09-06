"""Push notification ke perangkat Baraya/member (Expo Push Service).

ADDITIVE & non-destruktif:
- Memakai SATU koleksi baru `customer_push_devices` (token per device) — tidak
  mengubah koleksi/dokumen existing dan tidak menyentuh auth/RBAC.
- Push Firebase existing untuk topik Admin (`app/services/notifications.py`)
  tetap dipakai apa adanya; modul ini khusus notifikasi ke HP pemilik akun.
- Pusat notifikasi in-app (`notification_center`) tetap sumber riwayat; push
  hanya "pengantar" dengan judul/isi yang SAMA agar tidak ada teks palsu.

Satu dokumen per device:
    id, customer_id, token (ExponentPushToken), platform, device_id,
    app_version, created_at, updated_at, last_sent_at
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi.encoders import jsonable_encoder

from app.api.crud_factory import Repository
from app.core.database import Collections
from app.core.logging_config import get_logger
from app.models.base import utcnow

logger = get_logger(__name__)

repo = Repository(Collections.PUSH_DEVICES)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
TIMEOUT = 12.0


def is_expo_token(token: str) -> bool:
    value = (token or "").strip()
    return value.startswith("ExponentPushToken[") or value.startswith("ExpoPushToken[")


async def register_device(
    *,
    customer_id: str,
    token: str,
    platform: Optional[str] = None,
    device_id: Optional[str] = None,
    app_version: Optional[str] = None,
) -> Dict[str, Any]:
    """Simpan/segarkan token satu device. Idempoten per token (multi-device aman)."""
    now = jsonable_encoder(utcnow())
    existing = await repo.get_by({"token": token})
    payload = {
        "customer_id": customer_id,
        "token": token,
        "platform": (platform or "unknown").lower(),
        "device_id": device_id,
        "app_version": app_version,
        "updated_at": now,
    }
    if existing:
        updated = await repo.update(existing["id"], payload)
        return updated or {**existing, **payload}
    return await repo.create({**payload, "created_at": now, "last_sent_at": None})


async def unregister_device(*, customer_id: str, token: str) -> bool:
    doc = await repo.get_by({"token": token, "customer_id": customer_id})
    if not doc:
        return False
    await repo.delete(doc["id"])
    return True


async def list_devices(customer_id: str) -> List[Dict[str, Any]]:
    docs, _ = await repo.list({"customer_id": customer_id}, limit=20)
    return docs


async def _drop_invalid(token: str) -> None:
    doc = await repo.get_by({"token": token})
    if doc:
        await repo.delete(doc["id"])
        logger.info("push.token_dropped reason=DeviceNotRegistered")


async def send_to_customer(
    *, customer_id: str, title: str, body: str, data: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Kirim push ke seluruh device milik satu akun. Laporan selalu jujur."""
    devices = await list_devices(customer_id)
    tokens = [device["token"] for device in devices if is_expo_token(device.get("token", ""))]
    if not tokens:
        return {"delivered": False, "provider": "EXPO", "reason": "NO_DEVICE", "devices": 0}

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": "default",
            "data": data or {},
        }
        for token in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"accept": "application/json", "content-type": "application/json"},
            )
        response.raise_for_status()
        results = response.json().get("data") or []
    except Exception as exc:
        logger.error("push.send_failed error=%s", type(exc).__name__)
        return {
            "delivered": False,
            "provider": "EXPO",
            "error": type(exc).__name__,
            "devices": len(tokens),
        }

    delivered = 0
    for token, result in zip(tokens, results if isinstance(results, list) else []):
        if isinstance(result, dict) and result.get("status") == "ok":
            delivered += 1
            continue
        details = (result or {}).get("details") or {}
        if details.get("error") == "DeviceNotRegistered":
            await _drop_invalid(token)

    now = jsonable_encoder(utcnow())
    for device in devices:
        await repo.update(device["id"], {"last_sent_at": now})

    logger.info("push.sent delivered=%s devices=%s", delivered, len(tokens))
    return {
        "delivered": delivered > 0,
        "provider": "EXPO",
        "devices": len(tokens),
        "accepted": delivered,
    }
