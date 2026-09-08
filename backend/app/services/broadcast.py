"""Broadcast notifikasi ke akun Baraya (Member / Pemain / Staff).

ADDITIVE & non-destruktif:
- Koleksi baru `broadcasts` HANYA menyimpan jadwal + riwayat broadcast.
- Pengiriman memakai pusat notifikasi EXISTING (`notification_center` → koleksi
  `notifications`) dengan struktur dokumen yang sama, sehingga notifikasi muncul
  di icon lonceng / halaman notifikasi yang sudah dipakai user.
- Peran penerima memakai field existing pada koleksi `customers`
  (`role` tunggal + `roles` multi-profil). Tidak ada sistem peran baru.
- Push (Expo) bersifat best-effort dengan judul & isi yang SAMA — sama seperti
  alur notifikasi member existing.

Anti-duplikasi (dua lapis):
1. Klaim atomik `find_one_and_update` (SCHEDULED → SENDING) sehingga hanya satu
   proses/worker yang mengirim satu broadcast.
2. Pembuatan notifikasi memakai upsert idempoten per (penerima, broadcast),
   jadi walau proses diulang, penerima tidak pernah dapat notifikasi ganda.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict, List, Optional

from fastapi.encoders import jsonable_encoder
from pymongo import ASCENDING, ReturnDocument, UpdateOne

from app.api.crud_factory import Repository, serialize
from app.core.database import Collections, get_db
from app.core.logging_config import get_logger
from app.models.base import new_id, utcnow
from app.models.broadcast import (
    BroadcastCreate,
    BroadcastDelivery,
    BroadcastGroup,
    BroadcastStatus,
)
from app.services import notification_center as center
from app.services import push as push_service

logger = get_logger(__name__)

repo = Repository(Collections.BROADCASTS)

NOTIFICATION_TYPE = "BROADCAST"
REFERENCE_TYPE = "broadcast"
PLAYER_STAFF_ROLES = ["PEMAIN", "STAFF"]
CLAIM_STALE_MINUTES = 10
MAX_PER_RUN = 20
BULK_CHUNK = 500


# --------------------------------------------------------------- penerima
def recipient_query(group: str) -> Dict[str, Any]:
    """Filter penerima dari koleksi `customers` (hanya akun aktif).

    Akun lama tanpa field `roles` tetap tercakup karena `role` tunggal juga
    diperiksa (backward compatible).
    """
    query: Dict[str, Any] = {"status": "ACTIVE"}
    if group == BroadcastGroup.PLAYERS_ONLY.value:
        query["$or"] = [{"roles": "PEMAIN"}, {"role": "PEMAIN"}]
    elif group == BroadcastGroup.PLAYERS_AND_STAFF.value:
        query["$or"] = [
            {"roles": {"$in": PLAYER_STAFF_ROLES}},
            {"role": {"$in": PLAYER_STAFF_ROLES}},
        ]
    elif group == BroadcastGroup.MEMBERS_ONLY.value:
        # Masih Member saja: belum punya profil Pemain maupun Staff.
        query["roles"] = {"$nin": PLAYER_STAFF_ROLES}
        query["role"] = {"$nin": PLAYER_STAFF_ROLES}
    # ALL_MEMBERS → seluruh populasi akun Baraya aktif (bukan akun admin).
    return query


async def count_recipients(group: str) -> int:
    return await get_db()[Collections.CUSTOMERS].count_documents(recipient_query(group))


async def recipient_counts() -> Dict[str, int]:
    return {group.value: await count_recipients(group.value) for group in BroadcastGroup}


# -------------------------------------------------------------- pengiriman
async def _create_notifications(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Buat notifikasi via struktur dokumen pusat notifikasi existing.

    Idempoten: satu notifikasi per (penerima, broadcast) memakai upsert dengan
    kunci `reference_type` + `reference_id` + `recipient_id`.
    """
    db = get_db()
    now = jsonable_encoder(utcnow())
    cursor = db[Collections.CUSTOMERS].find(recipient_query(doc["recipient_group"]), {"id": 1})

    recipient_ids: List[str] = []
    ops: List[UpdateOne] = []
    created = 0

    async def flush(pending: List[UpdateOne]) -> int:
        if not pending:
            return 0
        result = await db[Collections.NOTIFICATIONS].bulk_write(pending, ordered=False)
        return result.upserted_count or 0

    async for customer in cursor:
        customer_id = customer.get("id")
        if not customer_id:
            continue
        recipient_ids.append(customer_id)
        ops.append(
            UpdateOne(
                {
                    "audience": center.AUDIENCE_CUSTOMER,
                    "recipient_id": customer_id,
                    "reference_type": REFERENCE_TYPE,
                    "reference_id": doc["id"],
                },
                {
                    "$setOnInsert": {
                        "id": new_id(),
                        "type": NOTIFICATION_TYPE,
                        "title": doc["title"],
                        "message": doc["message"],
                        "link": None,
                        "read": False,
                        "read_at": None,
                        "read_by": [],
                        "created_at": now,
                        "updated_at": now,
                    }
                },
                upsert=True,
            )
        )
        if len(ops) >= BULK_CHUNK:
            created += await flush(ops)
            ops = []
    created += await flush(ops)

    push_result: Dict[str, Any] = {"delivered": False, "reason": "SKIPPED"}
    if recipient_ids:
        try:
            push_result = await push_service.send_to_customers(
                customer_ids=recipient_ids,
                title=doc["title"],
                body=doc["message"],
                data={"type": NOTIFICATION_TYPE, "broadcast_id": doc["id"]},
            )
        except Exception as exc:  # push tidak boleh menggagalkan notifikasi in-app
            logger.warning("broadcast.push_failed error=%s", type(exc).__name__)
            push_result = {"delivered": False, "error": type(exc).__name__}

    logger.info(
        "broadcast.delivered id=%s group=%s recipients=%s notifications=%s push=%s",
        doc["id"],
        doc["recipient_group"],
        len(recipient_ids),
        created,
        push_result.get("delivered"),
    )
    return {
        "recipient_count": len(recipient_ids),
        "notification_count": created,
        "push": push_result,
    }


async def _mark_sent(broadcast_id: str, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    now = jsonable_encoder(utcnow())
    await repo.coll.update_one(
        {"id": broadcast_id},
        {
            "$set": {
                "status": BroadcastStatus.SENT.value,
                "sent_at": now,
                "updated_at": now,
                "recipient_count": result.get("recipient_count", 0),
                "notification_count": result.get("notification_count", 0),
                "push_delivered": bool((result.get("push") or {}).get("delivered")),
                "error_message": None,
            }
        },
    )
    return await repo.get(broadcast_id)


async def _mark_failed(broadcast_id: str, error: Exception) -> None:
    now = jsonable_encoder(utcnow())
    await repo.coll.update_one(
        {"id": broadcast_id},
        {
            "$set": {
                "status": BroadcastStatus.FAILED.value,
                "updated_at": now,
                "error_message": f"{type(error).__name__}: {error}"[:400],
            }
        },
    )
    logger.error("broadcast.failed id=%s error=%s", broadcast_id, type(error).__name__)


# ------------------------------------------------------------- klaim atomik
def _stale_cutoff() -> str:
    return jsonable_encoder(utcnow() - timedelta(minutes=CLAIM_STALE_MINUTES))


def _due_conditions() -> List[Dict[str, Any]]:
    """Broadcast yang boleh diproses sekarang.

    - status SCHEDULED dan waktunya sudah tiba, atau
    - status SENDING yang "macet" (proses sebelumnya mati) — aman diulang karena
      pembuatan notifikasi idempoten.
    """
    now = jsonable_encoder(utcnow())
    return [
        {"status": BroadcastStatus.SCHEDULED.value, "scheduled_at": {"$lte": now}},
        {"status": BroadcastStatus.SENDING.value, "claimed_at": {"$lte": _stale_cutoff()}},
    ]


async def _claim(extra: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    now = jsonable_encoder(utcnow())
    query: Dict[str, Any] = {"$or": _due_conditions()}
    if extra:
        query.update(extra)
    doc = await repo.coll.find_one_and_update(
        query,
        {
            "$set": {
                "status": BroadcastStatus.SENDING.value,
                "claimed_at": now,
                "updated_at": now,
            }
        },
        sort=[("scheduled_at", ASCENDING)],
        return_document=ReturnDocument.AFTER,
    )
    return serialize(doc) if doc else None


async def deliver_one(broadcast_id: str) -> Optional[Dict[str, Any]]:
    """Kirim satu broadcast bila memang sudah jatuh tempo & belum terkirim."""
    claimed = await _claim({"id": broadcast_id})
    if not claimed:
        return await repo.get(broadcast_id)
    try:
        result = await _create_notifications(claimed)
    except Exception as exc:
        await _mark_failed(broadcast_id, exc)
        raise
    return await _mark_sent(broadcast_id, result)


async def process_due_broadcasts(limit: int = MAX_PER_RUN) -> Dict[str, Any]:
    """Proses semua broadcast yang sudah jatuh tempo (dipakai scheduler & endpoint)."""
    processed = 0
    failed = 0
    for _ in range(max(1, limit)):
        claimed = await _claim()
        if not claimed:
            break
        try:
            result = await _create_notifications(claimed)
            await _mark_sent(claimed["id"], result)
            processed += 1
        except Exception as exc:
            await _mark_failed(claimed["id"], exc)
            failed += 1
    if processed or failed:
        logger.info("broadcast.process_due processed=%s failed=%s", processed, failed)
    return {"processed": processed, "failed": failed}


# ------------------------------------------------------------------ create
async def create_broadcast(payload: BroadcastCreate, created_by: str) -> Dict[str, Any]:
    scheduled_at = payload.resolved_scheduled_at()
    doc = await repo.create(
        {
            "title": payload.title,
            "message": payload.message,
            "recipient_group": payload.recipient_group.value,
            "delivery_type": payload.delivery_type.value,
            "scheduled_at": jsonable_encoder(scheduled_at),
            "status": BroadcastStatus.SCHEDULED.value,
            "created_by": created_by,
            "sent_at": None,
            "claimed_at": None,
            "recipient_count": None,
            "notification_count": None,
            "error_message": None,
        }
    )
    logger.info(
        "broadcast.created id=%s group=%s delivery=%s by=%s",
        doc["id"],
        doc["recipient_group"],
        doc["delivery_type"],
        created_by,
    )
    if payload.delivery_type == BroadcastDelivery.SEND_NOW:
        return await deliver_one(doc["id"]) or doc
    return doc


async def list_broadcasts(
    status: Optional[str] = None, limit: int = 50, skip: int = 0
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    items, total = await repo.list(query, limit=limit, skip=skip, sort=(("created_at", -1),))
    return {"items": items, "total": total, "limit": limit, "skip": skip}
