"""Fase 4B — pusat notifikasi persisten (riwayat untuk icon lonceng).

Additive: memakai satu koleksi baru `notifications` dan TIDAK menyentuh
sistem auth/RBAC existing. Push Firebase existing (`notifications.py`) tetap
dipakai apa adanya; modul ini yang menyimpan riwayat agar user & admin bisa
membuka kembali notifikasinya lewat icon lonceng.

Model data (satu dokumen per notifikasi):
    id, audience (ADMIN|CUSTOMER), recipient_id (customer id / None untuk admin),
    type, title, message, link, reference_type, reference_id,
    read (bool, untuk CUSTOMER), read_at, read_by (list email admin),
    created_at, updated_at
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.api.crud_factory import Repository
from app.core.database import Collections
from app.core.logging_config import get_logger
from app.models.base import utcnow
from fastapi.encoders import jsonable_encoder

logger = get_logger(__name__)

repo = Repository(Collections.NOTIFICATIONS)

AUDIENCE_ADMIN = "ADMIN"
AUDIENCE_CUSTOMER = "CUSTOMER"


async def create_notification(
    *,
    audience: str,
    type: str,
    title: str,
    message: str,
    recipient_id: Optional[str] = None,
    link: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Simpan satu notifikasi. Dipakai backend saat event terjadi."""
    doc = await repo.create(
        {
            "audience": audience,
            "recipient_id": recipient_id,
            "type": type,
            "title": title,
            "message": message,
            "link": link,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "read": False,
            "read_at": None,
            "read_by": [],
        }
    )
    logger.info(
        "notification.created audience=%s type=%s recipient=%s", audience, type, recipient_id
    )
    return doc


def _shape_for_admin(doc: Dict[str, Any], admin_email: str) -> Dict[str, Any]:
    item = dict(doc)
    item["read"] = admin_email in (doc.get("read_by") or [])
    item.pop("read_by", None)
    return item


async def list_admin(admin_email: str, limit: int = 30) -> Tuple[List[Dict[str, Any]], int, int]:
    """Notifikasi untuk semua admin (broadcast); status read per akun admin."""
    query = {"audience": AUDIENCE_ADMIN}
    items, total = await repo.list(query, limit=limit, sort=(("created_at", -1),))
    shaped = [_shape_for_admin(item, admin_email) for item in items]
    unread = await repo.coll.count_documents({**query, "read_by": {"$ne": admin_email}})
    return shaped, total, unread


async def list_customer(customer_id: str, limit: int = 30) -> Tuple[List[Dict[str, Any]], int, int]:
    query = {"audience": AUDIENCE_CUSTOMER, "recipient_id": customer_id}
    items, total = await repo.list(query, limit=limit, sort=(("created_at", -1),))
    for item in items:
        item.pop("read_by", None)
    unread = await repo.coll.count_documents({**query, "read": False})
    return items, total, unread


async def mark_admin_read(notification_id: str, admin_email: str) -> Optional[Dict[str, Any]]:
    doc = await repo.get_by({"id": notification_id, "audience": AUDIENCE_ADMIN})
    if not doc:
        return None
    await repo.coll.update_one(
        {"id": notification_id},
        {
            "$addToSet": {"read_by": admin_email},
            "$set": {"updated_at": jsonable_encoder(utcnow())},
        },
    )
    fresh = await repo.get(notification_id)
    return _shape_for_admin(fresh or doc, admin_email)


async def mark_admin_read_all(admin_email: str) -> int:
    result = await repo.coll.update_many(
        {"audience": AUDIENCE_ADMIN, "read_by": {"$ne": admin_email}},
        {
            "$addToSet": {"read_by": admin_email},
            "$set": {"updated_at": jsonable_encoder(utcnow())},
        },
    )
    return result.modified_count


async def mark_customer_read(notification_id: str, customer_id: str) -> Optional[Dict[str, Any]]:
    doc = await repo.get_by(
        {"id": notification_id, "audience": AUDIENCE_CUSTOMER, "recipient_id": customer_id}
    )
    if not doc:
        return None
    await repo.update(notification_id, {"read": True, "read_at": jsonable_encoder(utcnow())})
    fresh = await repo.get(notification_id)
    result = dict(fresh or doc)
    result.pop("read_by", None)
    return result


async def mark_customer_read_all(customer_id: str) -> int:
    result = await repo.coll.update_many(
        {"audience": AUDIENCE_CUSTOMER, "recipient_id": customer_id, "read": False},
        {"$set": {"read": True, "read_at": jsonable_encoder(utcnow())}},
    )
    return result.modified_count
