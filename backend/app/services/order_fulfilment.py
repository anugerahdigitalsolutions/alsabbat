"""Merchandise Fase 3 — lifecycle & fulfilment pesanan (server-side authority).

Additive: memakai koleksi `orders` existing (tanpa koleksi baru) dan pusat
notifikasi existing (`notification_center`). Snapshot order (harga, item,
alamat, ongkir) TIDAK PERNAH dihitung ulang di sini — modul ini hanya
menambahkan status, timestamp, data pengiriman (AWB), dan riwayat timeline.

Timeline bersifat IMMUTABLE: entri hanya ditambahkan (`$push`), tidak pernah
diubah atau dihapus saat status berubah.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.errors import ValidationFailedError
from app.core.logging_config import get_logger
from app.services import notification_center as notifications

logger = get_logger(__name__)

# Lifecycle existing (PENDING/PROCESSING/SHIPPED/COMPLETED/CANCELLED/REFUNDED)
# ditambah dua langkah fulfilment baru secara backward-compatible.
ORDER_STATUS_FLOW: Dict[str, List[str]] = {
    "PENDING": ["PROCESSING", "CANCELLED"],
    "PROCESSING": ["PACKED", "CANCELLED"],
    "PACKED": ["READY_TO_SHIP", "CANCELLED"],
    "READY_TO_SHIP": ["SHIPPED", "CANCELLED"],
    # Fase 5: pelanggan mengonfirmasi terima (COMPLETED) atau menolak (REJECTED).
    "SHIPPED": ["COMPLETED", "REJECTED"],
    # REJECTED menunggu keputusan refund; REFUNDED hanya dihasilkan alur refund.
    "REJECTED": [],
    "COMPLETED": [],
    "CANCELLED": [],
    "REFUNDED": [],
}

STATUS_TIMESTAMP_FIELD = {
    "PROCESSING": "processing_at",
    "PACKED": "packed_at",
    "READY_TO_SHIP": "ready_to_ship_at",
    "SHIPPED": "shipped_at",
    "COMPLETED": "completed_at",
    "REJECTED": "rejected_at",
    "CANCELLED": "cancelled_at",
}

# Status yang berarti paket sudah/siap diserahkan ke kurir → wajib ada resi.
SHIPMENT_REQUIRED_STATUS = {"READY_TO_SHIP", "SHIPPED"}

STATUS_LABEL = {
    "PENDING": "Menunggu Pembayaran",
    "PROCESSING": "Diproses",
    "PACKED": "Dikemas",
    "READY_TO_SHIP": "Siap Dikirim",
    "SHIPPED": "Dikirim",
    "COMPLETED": "Selesai",
    "REJECTED": "Ditolak Pembeli",
    "CANCELLED": "Dibatalkan",
    "REFUNDED": "Dana Dikembalikan",
}

EVENT_LABEL = {
    "ORDER_CREATED": "Pesanan dibuat",
    "COD_SHIPMENT_CREATED": "Pengiriman COD dibuat",
    "COD_SHIPMENT_FAILED": "Pembuatan pengiriman COD gagal",
    "RECEIVED_CONFIRMED": "Barang diterima pembeli",
    "REJECTED_BY_CUSTOMER": "Barang ditolak pembeli",
    "REFUND_REQUESTED": "Refund diajukan",
    "REFUND_UNDER_REVIEW": "Refund ditinjau",
    "REFUND_APPROVED": "Refund disetujui",
    "REFUND_REJECTED": "Refund ditolak",
    "REFUND_PROCESSING": "Refund diproses",
    "REFUND_COMPLETED": "Refund selesai",
    "REFUND_FAILED": "Refund gagal",
    "PAYMENT_EXPIRED": "Pembayaran kedaluwarsa",
    "STOCK_DEDUCTED": "Stok dikurangi",
    "STOCK_RESTOCKED": "Stok dikembalikan",
    "STOCK_SHORTFALL": "Stok tidak mencukupi",
    "PAYMENT_STATUS_CHANGED": "Status pembayaran diperbarui",
    "SHIPPING_UPDATED": "Data pengiriman diperbarui",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def effective_shipment(order: Dict[str, Any]) -> Dict[str, Any]:
    """Kurir/layanan/resi yang berlaku: input admin menimpa snapshot checkout.

    Snapshot checkout (`order["shipping"]`) tidak pernah ditulis ulang supaya
    histori pesanan tetap utuh; data fulfilment disimpan terpisah.
    """
    snapshot = order.get("shipping") or {}
    fulfilment = order.get("fulfilment") or {}
    return {
        "courier_code": fulfilment.get("courier_code") or snapshot.get("courier_code"),
        "courier_name": fulfilment.get("courier_name") or snapshot.get("courier_name"),
        "service_code": fulfilment.get("service_code") or snapshot.get("service_code"),
        "service_name": fulfilment.get("service_name") or snapshot.get("service_name"),
        "awb_number": fulfilment.get("awb_number"),
        "shipping_note": fulfilment.get("shipping_note"),
        "shipped_at": order.get("shipped_at"),
    }


def _payment_blocker(order: Dict[str, Any], payment_configured: bool) -> Optional[str]:
    if order.get("payment_status") == "PAID":
        return None
    if str(order.get("payment_method_choice") or "") == "COD":
        # COD dibayar saat barang diterima, jadi tidak menunggu status PAID.
        return None
    if not payment_configured:
        # Gateway belum dikonfigurasi: admin mengonfirmasi pembayaran manual.
        return None
    return (
        "Pesanan belum berstatus PAID di payment gateway. Tunggu notifikasi pembayaran "
        "terverifikasi sebelum memproses pesanan."
    )


def _shipment_blocker(order: Dict[str, Any]) -> Optional[str]:
    shipment = effective_shipment(order)
    missing = [
        label
        for field, label in (
            ("courier_code", "kurir"),
            ("service_code", "layanan"),
            ("awb_number", "nomor resi (AWB)"),
        )
        if not shipment.get(field)
    ]
    if missing:
        return "Lengkapi " + ", ".join(missing) + " sebelum menandai pesanan siap kirim/dikirim."
    return None


def transition_blocker(
    order: Dict[str, Any], target: str, *, payment_configured: bool
) -> Optional[str]:
    """Alasan penolakan transisi, atau None bila transisi sah."""
    current = str(order.get("order_status") or "PENDING")
    if target == current:
        return f"Pesanan sudah berstatus {STATUS_LABEL.get(target, target)}."
    allowed = ORDER_STATUS_FLOW.get(current)
    if allowed is None:
        return f"Status pesanan saat ini ({current}) tidak dikenali."
    if target not in allowed:
        if not allowed:
            return (
                f"Pesanan sudah final ({STATUS_LABEL.get(current, current)}) dan tidak bisa "
                "diubah lagi."
            )
        return (
            f"Perpindahan status {current} → {target} tidak diizinkan. Status berikutnya yang "
            "valid: " + ", ".join(allowed) + "."
        )
    if target == "PROCESSING":
        return _payment_blocker(order, payment_configured)
    if target in SHIPMENT_REQUIRED_STATUS:
        return _shipment_blocker(order)
    return None


def allowed_transitions(order: Dict[str, Any], *, payment_configured: bool) -> List[Dict[str, Any]]:
    """Daftar aksi untuk Admin Panel — hanya transisi struktural yang sah.

    `blocked_reason` diisi bila transisi sah menurut lifecycle tetapi syaratnya
    belum terpenuhi (mis. resi belum diisi), sehingga UI bisa menjelaskan sebab
    tombol tidak bisa dipakai tanpa mengarang aturan sendiri.
    """
    current = str(order.get("order_status") or "PENDING")
    result: List[Dict[str, Any]] = []
    for target in ORDER_STATUS_FLOW.get(current, []):
        blocker = transition_blocker(order, target, payment_configured=payment_configured)
        result.append(
            {
                "status": target,
                "label": STATUS_LABEL.get(target, target),
                "allowed": blocker is None,
                "blocked_reason": blocker,
            }
        )
    return result


def timeline_entry(
    *,
    event: str,
    status: Optional[str] = None,
    from_status: Optional[str] = None,
    actor: Optional[str] = None,
    actor_type: str = "SYSTEM",
    note: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "event": event,
        "status": status,
        "from_status": from_status,
        "at": _now(),
        "actor": actor,
        "actor_type": actor_type,
        "note": (note or None),
    }


def read_timeline(order: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Timeline untuk Admin Panel.

    Pesanan lama (dibuat sebelum Fase 3) belum punya `timeline`; entri
    ORDER_CREATED diturunkan dari `created_at` SAAT DIBACA (tanpa menulis ke
    database) supaya histori lama tetap terbaca tanpa migrasi.
    """
    entries = list(order.get("timeline") or [])
    if not entries:
        entries = [
            {
                "event": "ORDER_CREATED",
                "status": "PENDING",
                "from_status": None,
                "at": order.get("created_at"),
                "actor": None,
                "actor_type": "DERIVED",
                "note": "Diturunkan dari tanggal pesanan (sebelum timeline aktif).",
            }
        ]
    for entry in entries:
        entry["label"] = EVENT_LABEL.get(
            entry.get("event"), STATUS_LABEL.get(entry.get("status") or "", entry.get("event"))
        )
    return entries


def customer_timeline(order: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Timeline untuk pelanggan — tanpa identitas admin & catatan internal."""
    public: List[Dict[str, Any]] = []
    for entry in read_timeline(order):
        public.append(
            {
                "event": entry.get("event"),
                "status": entry.get("status"),
                "label": entry.get("label"),
                "at": entry.get("at"),
                "source": "TOKO" if entry.get("actor_type") == "ADMIN" else "SISTEM",
            }
        )
    return public


async def notify_customer_status(order: Dict[str, Any], status: str) -> None:
    """Notifikasi in-app (pusat notifikasi existing). Aman bila gagal."""
    customer_id = order.get("customer_id")
    if not customer_id:
        return
    shipment = effective_shipment(order)
    label = STATUS_LABEL.get(status, status)
    message = f"Pesanan {order.get('order_number')} kini berstatus {label}."
    if status in SHIPMENT_REQUIRED_STATUS and shipment.get("awb_number"):
        message += (
            f" Kurir {shipment.get('courier_name') or shipment.get('courier_code')} "
            f"· resi {shipment['awb_number']}."
        )
    try:
        await notifications.create_notification(
            audience=notifications.AUDIENCE_CUSTOMER,
            recipient_id=customer_id,
            type="ORDER_STATUS",
            title="Status pesanan diperbarui",
            message=message,
            link=f"/akun/pesanan/{order.get('id')}",
            reference_type="ORDER",
            reference_id=order.get("id"),
        )
    except Exception as exc:  # pragma: no cover - notifikasi tidak boleh memblokir
        logger.warning("order.notification_failed order=%s error=%s", order.get("id"), type(exc).__name__)
