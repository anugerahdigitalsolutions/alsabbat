"""Fase 4A — notifikasi Firebase Cloud Messaging untuk review Admin.

Kredensial hanya dari environment (`FIREBASE_PROJECT_ID`,
`FIREBASE_SERVICE_ACCOUNT_JSON`). Selama belum diisi, service melaporkan
NOT_CONFIGURED dengan jujur dan TIDAK pernah membuat notifikasi palsu.
Admin tetap melihat pengajuan baru melalui indikator PENDING di Admin Panel.
"""
from __future__ import annotations

import json
from typing import Any, Dict

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def _service_account() -> Dict[str, Any] | None:
    raw = settings.FIREBASE_SERVICE_ACCOUNT_JSON.strip()
    if not raw:
        return None
    try:
        if raw.startswith("{"):
            return json.loads(raw)
        with open(raw, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        logger.error("firebase.service_account_invalid error=%s", type(exc).__name__)
        return None


def _sdk_available() -> bool:
    try:
        import firebase_admin  # noqa: F401
    except Exception:
        return False
    return True


def firebase_status() -> Dict[str, Any]:
    """Status aman untuk Admin Panel — tidak pernah membocorkan kredensial."""
    account = _service_account()
    sdk = _sdk_available()
    configured = bool(settings.FIREBASE_PROJECT_ID and account and sdk)
    if configured:
        note = f"Notifikasi Firebase aktif (topik: {settings.FIREBASE_ADMIN_TOPIC})."
    elif settings.FIREBASE_PROJECT_ID and account and not sdk:
        note = "Kredensial ada, namun paket firebase-admin belum terpasang di server."
    else:
        note = (
            "Isi FIREBASE_PROJECT_ID dan FIREBASE_SERVICE_ACCOUNT_JSON di environment server. "
            "Selama belum diisi, pengajuan baru tetap terlihat sebagai PENDING di Admin Panel."
        )
    return {
        "configured": configured,
        "provider": "FIREBASE_FCM" if configured else "NOT_CONFIGURED",
        "project_id": settings.FIREBASE_PROJECT_ID,
        "topic": settings.FIREBASE_ADMIN_TOPIC,
        "sdk_installed": sdk,
        "note": note,
    }


def _client():
    import firebase_admin
    from firebase_admin import credentials

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(_service_account()))
    from firebase_admin import messaging

    return messaging


def notify_admin_review(*, title: str, body: str, data: Dict[str, str]) -> Dict[str, Any]:
    """Kirim notifikasi ke topik admin. Melaporkan hasil sebenarnya."""
    status = firebase_status()
    if not status["configured"]:
        logger.info("firebase.notification_skipped reason=NOT_CONFIGURED title=%s", title)
        return {"delivered": False, "provider": "NOT_CONFIGURED"}
    try:
        messaging = _client()
        messaging.send(
            messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data,
                topic=settings.FIREBASE_ADMIN_TOPIC,
            )
        )
    except Exception as exc:
        logger.error("firebase.notification_failed error=%s", type(exc).__name__)
        return {"delivered": False, "provider": "FIREBASE_FCM", "error": type(exc).__name__}
    logger.info("firebase.notification_sent title=%s", title)
    return {"delivered": True, "provider": "FIREBASE_FCM"}
