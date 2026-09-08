"""Fase 7 — stok atomik & restock idempoten (koleksi existing, tanpa model baru).

Semua pengurangan/pengembalian stok memakai operasi kondisional MongoDB
(`$inc` dengan filter `stock_quantity >= qty`) sehingga dua checkout paralel
tidak bisa membuat stok negatif (anti-overselling). Idempotensi dijaga dengan
flag pada dokumen order (`stock_applied`, `stock_restocked`) yang di-set lewat
update kondisional, bukan lewat pembacaan-lalu-tulis.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from app.api.crud_factory import Repository
from app.core.database import Collections
from app.core.logging_config import get_logger
from app.services import order_fulfilment as fulfilment

logger = get_logger(__name__)

orders = Repository(Collections.ORDERS)
products = Repository(Collections.PRODUCTS)
variants = Repository(Collections.PRODUCT_VARIANTS)


def _target(item: Dict[str, Any]) -> Tuple[Repository, Dict[str, Any]]:
    if item.get("variant_id"):
        return variants, {"id": item["variant_id"]}
    return products, {"id": item["product_id"]}


async def _claim(order_id: str, flag: str) -> bool:
    """Tandai order agar operasi stok hanya berjalan sekali (atomik)."""
    result = await orders.coll.update_one(
        {"id": order_id, flag: {"$ne": True}},
        {"$set": {flag: True, f"{flag}_at": datetime.now(timezone.utc).isoformat()}},
    )
    return bool(result.modified_count)


async def apply_stock(order: Dict[str, Any], *, actor: str, reason: str) -> bool:
    """Kurangi stok tepat satu kali. Mengembalikan False bila sudah pernah.

    Bila stok tidak lagi mencukupi, item dicatat di timeline sebagai
    `STOCK_SHORTFALL` (tanpa membuat stok negatif) supaya admin bisa menindak.
    """
    if not await _claim(order["id"], "stock_applied"):
        return False
    shortfall: List[str] = []
    for item in order.get("items") or []:
        repo, query = _target(item)
        quantity = int(item.get("quantity") or 0)
        result = await repo.coll.update_one(
            {**query, "stock_quantity": {"$gte": quantity}}, {"$inc": {"stock_quantity": -quantity}}
        )
        if not result.modified_count:
            shortfall.append(item.get("product_name") or item.get("product_id"))
    events = [
        fulfilment.timeline_entry(
            event="STOCK_DEDUCTED",
            status=order.get("order_status"),
            actor=actor,
            actor_type="SYSTEM",
            note=reason,
        )
    ]
    if shortfall:
        events.append(
            fulfilment.timeline_entry(
                event="STOCK_SHORTFALL",
                status=order.get("order_status"),
                actor=actor,
                actor_type="SYSTEM",
                note="Stok tidak mencukupi: " + ", ".join(sorted(set(shortfall))),
            )
        )
        logger.warning("commerce.stock.shortfall order=%s items=%s", order.get("order_number"), shortfall)
    await orders.coll.update_one({"id": order["id"]}, {"$push": {"timeline": {"$each": events}}})
    return True


async def restock(order: Dict[str, Any], *, actor: str, reason: str) -> bool:
    """Kembalikan stok tepat satu kali (hanya bila stok pernah dikurangi)."""
    if not order.get("stock_applied"):
        return False
    if not await _claim(order["id"], "stock_restocked"):
        return False
    for item in order.get("items") or []:
        repo, query = _target(item)
        await repo.coll.update_one(query, {"$inc": {"stock_quantity": int(item.get("quantity") or 0)}})
    await orders.coll.update_one(
        {"id": order["id"]},
        {
            "$push": {
                "timeline": fulfilment.timeline_entry(
                    event="STOCK_RESTOCKED",
                    status=order.get("order_status"),
                    actor=actor,
                    actor_type="SYSTEM",
                    note=reason,
                )
            }
        },
    )
    logger.info("commerce.stock.restocked order=%s reason=%s", order.get("order_number"), reason)
    return True


async def reserve(order: Dict[str, Any], *, actor: str, reason: str) -> List[str]:
    """Kunci stok untuk pesanan tanpa gateway (COD) — all-or-nothing.

    Setiap item dikurangi dengan filter `stock_quantity >= qty` (atomik). Bila
    salah satu item gagal, semua pengurangan pada panggilan ini dibatalkan
    sehingga tidak pernah terjadi overselling maupun stok tertahan.
    """
    if not await _claim(order["id"], "stock_applied"):
        return []
    done: List[Dict[str, Any]] = []
    shortfall: List[str] = []
    for item in order.get("items") or []:
        repo, query = _target(item)
        quantity = int(item.get("quantity") or 0)
        result = await repo.coll.update_one(
            {**query, "stock_quantity": {"$gte": quantity}}, {"$inc": {"stock_quantity": -quantity}}
        )
        if result.modified_count:
            done.append(item)
        else:
            shortfall.append(item.get("product_name") or item.get("product_id"))
    if shortfall:
        for item in done:
            repo, query = _target(item)
            await repo.coll.update_one(query, {"$inc": {"stock_quantity": int(item.get("quantity") or 0)}})
        await orders.coll.update_one(
            {"id": order["id"]}, {"$set": {"stock_applied": False}}
        )
        logger.info("commerce.stock.reserve_rejected order=%s items=%s", order.get("order_number"), shortfall)
        return shortfall
    await orders.coll.update_one(
        {"id": order["id"]},
        {
            "$push": {
                "timeline": fulfilment.timeline_entry(
                    event="STOCK_DEDUCTED", status=order.get("order_status"), actor=actor, actor_type="SYSTEM", note=reason
                )
            }
        },
    )
    return []


async def can_fulfil(items: List[Dict[str, Any]]) -> List[str]:
    """Nama item yang stoknya tidak lagi cukup (dipakai sebelum COD dibuat)."""
    missing: List[str] = []
    for item in items:
        repo, query = _target(item)
        doc = await repo.coll.find_one(query)
        if not doc or int(doc.get("stock_quantity") or 0) < int(item.get("quantity") or 0):
            missing.append(item.get("product_name") or item.get("product_id"))
    return missing
