"""Scheduler minimal untuk broadcast terjadwal (tanpa Redis/Celery/RabbitMQ).

Satu task asyncio di dalam proses API yang setiap interval memanggil
`process_due_broadcasts()`. Aman bila berjalan di beberapa instance sekaligus
karena pengiriman memakai klaim atomik + notifikasi idempoten.

Di runtime serverless (Vercel) loop TIDAK dijalankan — di sana broadcast jatuh
tempo diproses lewat endpoint `POST /api/broadcasts/process-due` (cron/manual).
"""
from __future__ import annotations

import asyncio
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.broadcast import process_due_broadcasts

logger = get_logger(__name__)

_task: Optional[asyncio.Task] = None


async def _loop() -> None:
    interval = max(15, settings.BROADCAST_SCHEDULER_INTERVAL_SECONDS)
    logger.info("broadcast.scheduler_started interval=%ss", interval)
    while True:
        try:
            await asyncio.sleep(interval)
            await process_due_broadcasts()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # scheduler tidak boleh mati karena satu error
            logger.error("broadcast.scheduler_error error=%s", type(exc).__name__)


def start_scheduler() -> None:
    global _task
    if not settings.BROADCAST_SCHEDULER_ENABLED or settings.is_serverless:
        logger.info(
            "broadcast.scheduler_disabled serverless=%s enabled=%s",
            settings.is_serverless,
            settings.BROADCAST_SCHEDULER_ENABLED,
        )
        return
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_loop())


async def stop_scheduler() -> None:
    global _task
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except (asyncio.CancelledError, Exception):
            pass
    _task = None
