"""Fase 6 — refund (Midtrans resmi & COD/manual) dengan audit trail.

Koleksi baru `refunds` dipakai karena satu pesanan bisa punya riwayat pengajuan
refund dengan lifecycle sendiri (REQUESTED → … → COMPLETED/FAILED); menumpuknya
di dokumen order akan menimpa snapshot pesanan dan menyulitkan audit. Timeline
pesanan tetap dipakai sebagai jejak audit tunggal untuk perubahan pesanan.

Tidak ada refund yang dianggap berhasil hanya karena permintaan API terkirim:
status akhir selalu berasal dari balasan provider (Midtrans) atau konfirmasi
transfer manual oleh admin (COD).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.api.crud_factory import Repository
from app.core.database import Collections
from app.core.errors import NotFoundError, ValidationFailedError
from app.core.logging_config import get_logger
from app.services import commerce_stock, notification_center as notifications
from app.services import order_fulfilment as fulfilment
from app.services.payments import active_provider

logger = get_logger(__name__)

refunds = Repository(Collections.REFUNDS)
orders = Repository(Collections.ORDERS)

# Status pesanan yang boleh diajukan refund (barang sudah dibayar/diterima/ditolak).
ELIGIBLE_ORDER_STATUS = {"SHIPPED", "COMPLETED", "REJECTED"}
OPEN_REFUND_STATUS = {"REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"}

REFUND_FLOW = {
    "REQUESTED": ["UNDER_REVIEW", "APPROVED", "REJECTED"],
    "UNDER_REVIEW": ["APPROVED", "REJECTED"],
    "APPROVED": ["PROCESSING"],
    "PROCESSING": ["COMPLETED", "FAILED"],
    "FAILED": ["PROCESSING"],
    "COMPLETED": [],
    "REJECTED": [],
}

STATUS_LABEL = {
    "REQUESTED": "Diajukan",
    "UNDER_REVIEW": "Ditinjau",
    "APPROVED": "Disetujui",
    "REJECTED": "Ditolak",
    "PROCESSING": "Diproses",
    "COMPLETED": "Selesai",
    "FAILED": "Gagal",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _entry(status: str, actor: str, actor_type: str, note: Optional[str] = None) -> Dict[str, Any]:
    return {"status": status, "at": _now(), "actor": actor, "actor_type": actor_type, "note": note or None}


def public_refund(doc: Dict[str, Any], *, for_customer: bool = False) -> Dict[str, Any]:
    payload = {k: v for k, v in doc.items() if k != "_id"}
    payload["status_label"] = STATUS_LABEL.get(doc.get("status"), doc.get("status"))
    if for_customer:
        payload["timeline"] = [
            {
                "status": e.get("status"),
                "status_label": STATUS_LABEL.get(e.get("status"), e.get("status")),
                "at": e.get("at"),
                "source": "TOKO" if e.get("actor_type") == "ADMIN" else "SISTEM",
            }
            for e in doc.get("timeline") or []
        ]
        payload.pop("provider_response", None)
    return payload


async def _notify(refund: Dict[str, Any], status: str, extra: str = "") -> None:
    if not refund.get("customer_id"):
        return
    try:
        await notifications.create_notification(
            audience=notifications.AUDIENCE_CUSTOMER,
            recipient_id=refund["customer_id"],
            type="REFUND_STATUS",
            title="Status refund diperbarui",
            message=(
                f"Refund pesanan {refund.get('order_number')} kini berstatus "
                f"{STATUS_LABEL.get(status, status)}." + (f" {extra}" if extra else "")
            ),
            link=f"/akun/pesanan/{refund.get('order_id')}",
            reference_type="REFUND",
            reference_id=refund.get("id"),
        )
    except Exception as exc:  # pragma: no cover - notifikasi tidak boleh memblokir
        logger.warning("refund.notification_failed refund=%s error=%s", refund.get("id"), type(exc).__name__)


async def _push_order_event(order: Dict[str, Any], event: str, actor: str, actor_type: str, note: Optional[str]) -> None:
    await orders.coll.update_one(
        {"id": order["id"]},
        {
            "$push": {
                "timeline": fulfilment.timeline_entry(
                    event=event,
                    status=order.get("order_status"),
                    actor=actor,
                    actor_type=actor_type,
                    note=note,
                )
            }
        },
    )


async def open_refund_for(order_id: str) -> Optional[Dict[str, Any]]:
    return await refunds.get_by({"order_id": order_id, "status": {"$in": list(OPEN_REFUND_STATUS)}})


async def latest_for_order(order_id: str) -> Optional[Dict[str, Any]]:
    items, _ = await refunds.list({"order_id": order_id}, limit=1, sort=(("created_at", -1),))
    return items[0] if items else None


async def request_refund(
    order: Dict[str, Any],
    *,
    actor: str,
    actor_type: str,
    reason: str,
    detail: str,
    evidence_urls: List[str],
    bank_account: Optional[str] = None,
) -> Dict[str, Any]:
    if order.get("order_status") not in ELIGIBLE_ORDER_STATUS:
        raise ValidationFailedError(
            "Refund hanya dapat diajukan setelah pesanan dikirim, diterima, atau ditolak."
        )
    if order.get("payment_status") == "REFUNDED":
        raise ValidationFailedError("Pesanan ini sudah pernah direfund.")
    if await open_refund_for(order["id"]):
        raise ValidationFailedError("Sudah ada pengajuan refund yang sedang diproses untuk pesanan ini.")
    completed = await refunds.get_by({"order_id": order["id"], "status": "COMPLETED"})
    if completed:
        raise ValidationFailedError("Refund untuk pesanan ini sudah selesai.")

    doc = await refunds.create(
        {
            "order_id": order["id"],
            "order_number": order["order_number"],
            "customer_id": order.get("customer_id"),
            "customer_email": (order.get("customer") or {}).get("email"),
            "amount": int(order.get("total") or 0),
            "currency": order.get("currency") or "IDR",
            "method": "COD_MANUAL" if str(order.get("payment_method_choice")) == "COD" else "MIDTRANS",
            "reason": reason,
            "detail": detail,
            "evidence_urls": evidence_urls[:5],
            "bank_account": bank_account,
            "status": "REQUESTED",
            "decision_note": None,
            "provider_reference": None,
            "provider_status": None,
            "transfer_reference": None,
            "transferred_at": None,
            "timeline": [_entry("REQUESTED", actor, actor_type, reason)],
        }
    )
    await _push_order_event(order, "REFUND_REQUESTED", actor, actor_type, f"{reason} · refund {doc['id']}")
    await _notify(doc, "REQUESTED")
    logger.info("refund.requested order=%s refund=%s", order["order_number"], doc["id"])
    return doc


def _guard(refund: Dict[str, Any], target: str) -> None:
    current = str(refund.get("status"))
    allowed = REFUND_FLOW.get(current, [])
    if target not in allowed:
        if not allowed:
            raise ValidationFailedError(
                f"Refund sudah final ({STATUS_LABEL.get(current, current)}) dan tidak bisa diubah lagi."
            )
        raise ValidationFailedError(
            f"Perpindahan status refund {current} → {target} tidak diizinkan. "
            "Status berikutnya yang valid: " + ", ".join(allowed) + "."
        )


async def _transition(refund_id: str, current: str, changes: Dict[str, Any], entry: Dict[str, Any]) -> Dict[str, Any]:
    result = await refunds.coll.update_one(
        {"id": refund_id, "status": current},
        {"$set": {**changes, "updated_at": _now()}, "$push": {"timeline": entry}},
    )
    if not result.modified_count:
        raise ValidationFailedError("Status refund sudah berubah oleh proses lain. Muat ulang data refund.")
    return await refunds.get(refund_id)


async def review(refund_id: str, *, decision: str, note: Optional[str], actor: str) -> Dict[str, Any]:
    refund = await refunds.get(refund_id)
    if not refund:
        raise NotFoundError("Pengajuan refund tidak ditemukan.")
    _guard(refund, decision)
    updated = await _transition(
        refund_id,
        refund["status"],
        {"status": decision, "decision_note": note, "decided_by": actor, "decided_at": _now()},
        _entry(decision, actor, "ADMIN", note),
    )
    order = await orders.get(refund["order_id"])
    if order:
        await _push_order_event(
            order,
            f"REFUND_{decision}",
            actor,
            "ADMIN",
            note or f"Refund {refund_id}",
        )
    await _notify(updated, decision, note or "")
    return updated


async def process(refund_id: str, *, actor: str) -> Dict[str, Any]:
    """Jalankan refund: Midtrans lewat API resmi, COD menunggu transfer manual."""
    refund = await refunds.get(refund_id)
    if not refund:
        raise NotFoundError("Pengajuan refund tidak ditemukan.")
    _guard(refund, "PROCESSING")
    order = await orders.get(refund["order_id"])
    if not order:
        raise NotFoundError("Pesanan refund tidak ditemukan.")

    refund = await _transition(
        refund_id,
        refund["status"],
        {"status": "PROCESSING"},
        _entry("PROCESSING", actor, "ADMIN", None),
    )
    await _push_order_event(order, "REFUND_PROCESSING", actor, "ADMIN", f"Refund {refund_id}")
    await _notify(refund, "PROCESSING")

    if refund["method"] == "COD_MANUAL":
        # COD tidak lewat gateway: admin mencatat transfer manual lalu konfirmasi.
        return refund

    if order.get("payment_status") != "PAID":
        raise ValidationFailedError(
            "Refund Midtrans hanya untuk pesanan yang pembayarannya sudah PAID."
        )
    result = await active_provider().refund(order, int(refund["amount"]), refund.get("reason") or "Refund")
    if result.get("ok"):
        return await complete(
            refund_id,
            actor=actor,
            provider_reference=result.get("reference"),
            provider_status=result.get("status"),
            note=result.get("message"),
        )
    failed = await _transition(
        refund_id,
        "PROCESSING",
        {"status": "FAILED", "provider_status": result.get("status")},
        _entry("FAILED", actor, "ADMIN", result.get("message") or result.get("status")),
    )
    await _push_order_event(order, "REFUND_FAILED", actor, "ADMIN", result.get("status"))
    await _notify(failed, "FAILED")
    logger.warning("refund.failed refund=%s status=%s", refund_id, result.get("status"))
    return failed


async def manual_transfer(
    refund_id: str,
    *,
    actor: str,
    amount: int,
    transfer_reference: str,
    transferred_at: Optional[str],
    note: Optional[str],
) -> Dict[str, Any]:
    refund = await refunds.get(refund_id)
    if not refund:
        raise NotFoundError("Pengajuan refund tidak ditemukan.")
    if refund["method"] != "COD_MANUAL":
        raise ValidationFailedError("Transfer manual hanya untuk refund COD.")
    if refund["status"] != "PROCESSING":
        raise ValidationFailedError("Catat transfer manual hanya saat refund berstatus PROCESSING.")
    if int(amount) > int(refund["amount"]):
        raise ValidationFailedError("Nominal transfer melebihi nilai pesanan.")
    return await complete(
        refund_id,
        actor=actor,
        amount=int(amount),
        transfer_reference=transfer_reference,
        transferred_at=transferred_at or _now(),
        note=note,
    )


async def complete(
    refund_id: str,
    *,
    actor: str,
    provider_reference: Optional[str] = None,
    provider_status: Optional[str] = None,
    amount: Optional[int] = None,
    transfer_reference: Optional[str] = None,
    transferred_at: Optional[str] = None,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    refund = await refunds.get(refund_id)
    if not refund:
        raise NotFoundError("Pengajuan refund tidak ditemukan.")
    _guard(refund, "COMPLETED")
    changes: Dict[str, Any] = {"status": "COMPLETED", "completed_at": _now()}
    if provider_reference:
        changes["provider_reference"] = provider_reference
    if provider_status:
        changes["provider_status"] = provider_status
    if amount is not None:
        changes["refunded_amount"] = int(amount)
    if transfer_reference:
        changes["transfer_reference"] = transfer_reference
    if transferred_at:
        changes["transferred_at"] = transferred_at
    updated = await _transition(refund_id, refund["status"], changes, _entry("COMPLETED", actor, "ADMIN", note))

    order = await orders.get(refund["order_id"])
    if order:
        # Refund selesai → pesanan REFUNDED + stok dikembalikan tepat satu kali.
        await orders.coll.update_one(
            {"id": order["id"], "payment_status": {"$ne": "REFUNDED"}},
            {
                "$set": {
                    "payment_status": "REFUNDED",
                    "order_status": "REFUNDED",
                    "refunded_at": _now(),
                },
                "$push": {
                    "timeline": fulfilment.timeline_entry(
                        event="REFUND_COMPLETED",
                        status="REFUNDED",
                        from_status=order.get("order_status"),
                        actor=actor,
                        actor_type="ADMIN",
                        note=note or f"Refund {refund_id}",
                    )
                },
            },
        )
        fresh = await orders.get(order["id"]) or order
        await commerce_stock.restock(fresh, actor=actor, reason=f"Refund {refund_id} selesai")
    await _notify(updated, "COMPLETED")
    logger.info("refund.completed refund=%s order=%s", refund_id, refund.get("order_number"))
    return updated
