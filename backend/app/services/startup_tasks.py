"""Startup task runner yang aman untuk serverless (Vercel Functions).

Masalah di serverless: `lifespan` dijalankan setiap kali instance baru dingin
(cold start), sehingga `ensure_indexes()` + `run_bootstrap()` bisa terpanggil
berulang dan bersamaan.

Solusi minimal (TIDAK menghapus keduanya):
1. Flag per proses  -> maksimal sekali per instance function.
2. Klaim di MongoDB  -> `find_one_and_update` bersyarat pada dokumen tunggal
   `system_startup`, jadi hanya SATU invocation yang benar-benar menjalankan
   index + bootstrap dalam rentang `STARTUP_TASKS_MIN_INTERVAL_MINUTES`.
3. Tidak pernah dijalankan per request (hanya di lifespan / pemanggilan eksplisit).

Kedua operasi tetap idempotent, jadi aman bila tetap terjadi race.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict

from fastapi.encoders import jsonable_encoder

from app.core.config import settings
from app.core.database import Collections, ensure_indexes, get_db, ping
from app.core.logging_config import get_logger
from app.models.base import utcnow
from app.services.bootstrap import run_bootstrap

logger = get_logger(__name__)

STARTUP_COLLECTION = "system_startup"
STARTUP_DOC_ID = "startup_tasks"

_process_done = False


async def _claim_run() -> bool:
    """True bila proses ini berhak menjalankan startup task sekarang."""
    interval = max(0, settings.STARTUP_TASKS_MIN_INTERVAL_MINUTES)
    if interval == 0:
        return True
    now = utcnow()
    cutoff = jsonable_encoder(now - timedelta(minutes=interval))
    coll = get_db()[STARTUP_COLLECTION]
    doc = await coll.find_one_and_update(
        {
            "_id": STARTUP_DOC_ID,
            "$or": [
                {"last_run_at": {"$lt": cutoff}},
                {"last_run_at": None},
                {"app_version": {"$ne": settings.APP_VERSION}},
            ],
        },
        {
            "$set": {
                "last_run_at": jsonable_encoder(now),
                "app_version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT,
                "serverless": settings.is_serverless,
            }
        },
        upsert=False,
    )
    if doc is not None:
        return True
    # Dokumen belum ada -> coba buat (hanya satu invocation yang berhasil).
    try:
        await coll.insert_one(
            {
                "_id": STARTUP_DOC_ID,
                "last_run_at": jsonable_encoder(now),
                "app_version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT,
                "serverless": settings.is_serverless,
            }
        )
        return True
    except Exception:
        # Duplicate key -> invocation lain sudah mengklaim.
        return False


async def run_startup_tasks_once(force: bool = False) -> Dict[str, Any]:
    """Jalankan ensure_indexes() + run_bootstrap() maksimal sekali per instance."""
    global _process_done
    if _process_done and not force:
        return {"executed": False, "reason": "already_done_in_this_instance"}
    _process_done = True

    if not await ping():
        logger.error("Database unreachable at startup — API akan melayani health status degraded")
        return {"executed": False, "reason": "database_unreachable"}

    try:
        needs_bootstrap = (
            await get_db()[Collections.USERS].count_documents({}, limit=1) == 0
        )
    except Exception:
        needs_bootstrap = False

    try:
        # Database baru/kosong -> selalu jalankan (index + admin bootstrap) tanpa throttle.
        # Sinkronisasi password admin staging juga tidak boleh terkena throttle,
        # agar berlaku pada cold start pertama setelah redeploy.
        run_now = force or needs_bootstrap or settings.bootstrap_admin_password_reset_enabled
        claimed = True if run_now else await _claim_run()
    except Exception as exc:
        logger.warning("startup.claim_failed: %s", type(exc).__name__)
        claimed = True  # aman: kedua operasi idempotent

    if not claimed:
        logger.info("startup.skipped (sudah dijalankan instance lain baru-baru ini)")
        return {"executed": False, "reason": "claimed_by_other_instance"}

    try:
        await ensure_indexes()
        await run_bootstrap()
    except Exception as exc:
        # Lepaskan klaim supaya cold start berikutnya bisa mencoba lagi
        # (mis. env BOOTSTRAP_ADMIN_PASSWORD baru diisi setelah deploy pertama).
        try:
            await get_db()[STARTUP_COLLECTION].update_one(
                {"_id": STARTUP_DOC_ID}, {"$set": {"last_run_at": None}}
            )
        except Exception:
            pass
        logger.error("startup.tasks_failed: %s", type(exc).__name__)
        raise
    logger.info("startup.tasks_completed (indexes + bootstrap admin)")
    return {"executed": True, "bootstrap_needed": needs_bootstrap}
