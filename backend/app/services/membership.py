"""Fase 17 — Baraya ALSABBAT member identity (additive to the existing `customers`).

No second auth system, no `members` collection: every Baraya customer *is* the member.
  * `member_number`  -> human readable, sequential, unique (ALS-000001)
  * `member_code`    -> unguessable public identifier used by the QR code only
Never contains passwords, JWTs or session data.
"""
from __future__ import annotations

import secrets
from typing import Any, Dict

from fastapi.encoders import jsonable_encoder

from app.core.database import Collections, get_db
from app.models.base import utcnow

MEMBER_PREFIX = "ALS"
MEMBER_SEQUENCE = "baraya-member-number"


async def _next_sequence() -> int:
    # Same `counters` convention as the order numbering: _id keyed, `seq` incremented.
    doc = await get_db()[Collections.COUNTERS].find_one_and_update(
        {"_id": MEMBER_SEQUENCE},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return int(doc["seq"])


def _format_number(sequence: int) -> str:
    return f"{MEMBER_PREFIX}-{sequence:06d}"


async def ensure_member_identity(customer: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotently attaches member_number/member_code to a customer document."""
    if customer.get("member_number") and customer.get("member_code"):
        return customer

    updates: Dict[str, Any] = {"updated_at": jsonable_encoder(utcnow())}
    if not customer.get("member_code"):
        updates["member_code"] = secrets.token_urlsafe(16)
    if not customer.get("member_number"):
        updates["member_number"] = _format_number(await _next_sequence())
    if not customer.get("joined_at"):
        updates["joined_at"] = customer.get("created_at") or jsonable_encoder(utcnow())

    await get_db()[Collections.CUSTOMERS].update_one({"id": customer["id"]}, {"$set": updates})
    return {**customer, **updates}


def member_card_payload(customer: Dict[str, Any]) -> Dict[str, Any]:
    """Private card data for the signed-in owner (and admin preview). No credentials."""
    return {
        "member_number": customer.get("member_number"),
        "member_code": customer.get("member_code"),
        "full_name": customer.get("full_name"),
        "photo_url": customer.get("photo_url"),
        "status": customer.get("status"),
        "joined_at": customer.get("joined_at") or customer.get("created_at"),
    }


def member_verification_payload(customer: Dict[str, Any] | None) -> Dict[str, Any]:
    """Minimum public information exposed by the QR verification endpoint."""
    if not customer or not customer.get("member_number"):
        return {"found": False, "valid": False, "status": None}
    active = customer.get("status") == "ACTIVE"
    return {
        "found": True,
        "valid": active,
        "status": customer.get("status"),
        "member_number": customer.get("member_number"),
        "full_name": customer.get("full_name"),
        "joined_at": customer.get("joined_at") or customer.get("created_at"),
    }
