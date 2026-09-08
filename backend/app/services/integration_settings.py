"""Penyimpanan aman + resolver untuk integration settings (Merchandise Fase 1).

Prioritas pembacaan nilai:
    1. Integration setting dari Admin Panel (koleksi `integration_settings`)
    2. Environment variable dengan nama yang sama (perilaku lama tetap jalan)
    3. Belum dikonfigurasi (None)

Koleksi ini TIDAK pernah dibaca oleh endpoint publik. Nilai rahasia tidak pernah
dikembalikan sebagai plaintext dan tidak pernah masuk ke log — hanya nama key.

Cache in-process dipakai supaya pemeriksa konfigurasi yang sinkron (mis.
`verify_notification` pada provider pembayaran) tetap bisa membaca nilai tanpa
mengubah signature fungsi yang sudah ada.
"""
from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional

from fastapi.encoders import jsonable_encoder

from app.api.crud_factory import Repository
from app.core.database import Collections
from app.core.logging_config import get_logger
from app.models.base import new_id, utcnow
from app.models.integration_settings import (
    DEFINITION_BY_KEY,
    GROUP_LABELS,
    SETTING_DEFINITIONS,
    mask_value,
    normalise_value,
)

logger = get_logger(__name__)

repo = Repository(Collections.INTEGRATION_SETTINGS)

CACHE_TTL_SECONDS = 30
_cache: Dict[str, str] = {}
_loaded_at: float = 0.0


# ------------------------------------------------------------------- cache
async def refresh_cache() -> int:
    """Muat ulang seluruh setting dari database ke cache proses."""
    global _cache, _loaded_at
    values: Dict[str, str] = {}
    cursor = repo.coll.find({}, {"_id": 0, "key": 1, "value": 1})
    async for doc in cursor:
        key = doc.get("key")
        value = doc.get("value")
        if key and value:
            values[str(key)] = str(value)
    _cache = values
    _loaded_at = time.monotonic()
    logger.info("integration_settings.cache_loaded keys=%s", sorted(values.keys()))
    return len(values)


async def ensure_fresh() -> None:
    if time.monotonic() - _loaded_at > CACHE_TTL_SECONDS:
        try:
            await refresh_cache()
        except Exception as exc:  # database bermasalah tidak boleh mematikan pembayaran
            logger.warning("integration_settings.cache_refresh_failed error=%s", type(exc).__name__)


def resolve(key: str) -> Optional[str]:
    """Nilai efektif: Admin setting → environment variable → None."""
    value = _cache.get(key)
    if value:
        return value
    env_value = os.environ.get(key)
    return env_value or None


def resolve_bool(key: str) -> bool:
    return str(resolve(key) or "").strip().lower() in {"1", "true", "yes", "on"}


def source_of(key: str) -> Optional[str]:
    if _cache.get(key):
        return "ADMIN"
    if os.environ.get(key):
        return "ENV"
    return None


# -------------------------------------------------------------------- read
async def list_settings() -> Dict[str, Any]:
    """Metadata + status konfigurasi. Nilai rahasia SELALU di-mask."""
    await refresh_cache()
    stored: Dict[str, Dict[str, Any]] = {}
    cursor = repo.coll.find({}, {"_id": 0, "key": 1, "updated_at": 1, "updated_by": 1})
    async for doc in cursor:
        stored[str(doc.get("key"))] = doc

    items: List[Dict[str, Any]] = []
    for definition in SETTING_DEFINITIONS:
        key = definition["key"]
        effective = resolve(key)
        is_secret = definition["type"] == "SECRET"
        meta = stored.get(key) or {}
        items.append(
            {
                "key": key,
                "group": definition["group"],
                "group_label": GROUP_LABELS.get(definition["group"], definition["group"]),
                "label": definition["label"],
                "type": definition["type"],
                "secret": is_secret,
                "help": definition.get("help"),
                "configured": bool(effective),
                "source": source_of(key),
                # Rahasia: hanya bentuk ter-mask. Non-rahasia: nilai apa adanya.
                "masked_value": mask_value(effective) if is_secret else None,
                "value": None if is_secret else effective,
                "updated_at": meta.get("updated_at"),
                "updated_by": meta.get("updated_by"),
            }
        )
    return {
        "items": items,
        "groups": [{"key": key, "label": label} for key, label in GROUP_LABELS.items()],
        "total": len(items),
    }


# ------------------------------------------------------------------- write
async def save_settings(values: Dict[str, Any], actor: Optional[str]) -> Dict[str, Any]:
    """Simpan/hapus setting. Key yang tidak dikirim TIDAK diubah."""
    unknown = [key for key in values if key not in DEFINITION_BY_KEY]
    if unknown:
        from app.core.errors import ValidationFailedError

        raise ValidationFailedError("Setting tidak dikenal: " + ", ".join(sorted(unknown)))

    now = jsonable_encoder(utcnow())
    saved: List[str] = []
    cleared: List[str] = []

    for key, raw in values.items():
        normalised = normalise_value(key, raw)
        if normalised is None:
            result = await repo.coll.delete_one({"key": key})
            if result.deleted_count:
                cleared.append(key)
            continue
        await repo.coll.update_one(
            {"key": key},
            {
                "$set": {
                    "value": normalised,
                    "group": DEFINITION_BY_KEY[key]["group"],
                    "secret": DEFINITION_BY_KEY[key]["type"] == "SECRET",
                    "updated_at": now,
                    "updated_by": actor,
                },
                "$setOnInsert": {"id": new_id(), "key": key, "created_at": now},
            },
            upsert=True,
        )
        saved.append(key)

    await refresh_cache()
    # Hanya nama key yang dicatat — nilai/rahasia tidak pernah masuk log.
    logger.info(
        "integration_settings.saved actor=%s saved=%s cleared=%s",
        actor,
        sorted(saved),
        sorted(cleared),
    )
    return {"saved": sorted(saved), "cleared": sorted(cleared)}
