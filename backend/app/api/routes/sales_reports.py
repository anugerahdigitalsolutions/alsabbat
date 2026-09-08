"""Fase 7B — Laporan Penjualan (agregasi MongoDB, dihitung SERVER-SIDE).

Definisi angka (dipakai konsisten di API & UI):
- **Order terhitung (counted)**: pesanan yang benar-benar menjadi penjualan, yaitu
  `order_status ∉ {PENDING, CANCELLED}` DAN (`payment_status = PAID` ATAU metode COD).
  Pesanan yang masih menunggu pembayaran / dibatalkan / kedaluwarsa tidak dihitung.
- **Gross Sales**: Σ `subtotal` pesanan terhitung (nilai barang pada harga saat pesanan
  dibuat — snapshot, bukan harga katalog terbaru).
- **Shipping Amount**: Σ `shipping_cost` pesanan terhitung.
- **COD Fee**: Σ `cod_fee` pesanan terhitung.
- **Total Refund**: Σ nominal refund berstatus COMPLETED (`refunded_amount` bila diisi,
  jika tidak `amount`) dari koleksi `refunds` pada rentang tanggal yang sama.
- **Net Sales**: Gross Sales + Shipping Amount + COD Fee − Total Refund.

Rentang tanggal memakai zona waktu aplikasi (WIB, UTC+7) lalu dikonversi ke UTC
karena `created_at` disimpan dalam ISO UTC.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import require_permission
from app.core.database import Collections, get_db
from app.core.errors import ValidationFailedError
from app.models.auth import AuthContext

router = APIRouter(tags=["sales-reports"])
report_read = Depends(require_permission("order:read"))

WIB = timezone(timedelta(hours=7))
COUNTED_MATCH = {
    "order_status": {"$nin": ["PENDING", "CANCELLED"]},
    "$or": [{"payment_status": "PAID"}, {"payment_method_choice": "COD"}],
}


def _range(period: str, date_from: Optional[str], date_to: Optional[str]) -> Tuple[str, str, str, str]:
    """Kembalikan (start_iso_utc, end_iso_utc, label_from, label_to)."""
    now = datetime.now(WIB)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "today":
        start, end = today, today + timedelta(days=1)
    elif period == "yesterday":
        start, end = today - timedelta(days=1), today
    elif period == "this_week":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=7)
    elif period == "this_month":
        start = today.replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1)
    elif period == "last_month":
        first_this = today.replace(day=1)
        end = first_this
        start = (first_this - timedelta(days=1)).replace(day=1)
    elif period == "custom":
        if not date_from or not date_to:
            raise ValidationFailedError("Rentang kustom membutuhkan tanggal awal dan akhir.")
        try:
            start = datetime.fromisoformat(date_from).replace(tzinfo=WIB)
            end = datetime.fromisoformat(date_to).replace(tzinfo=WIB) + timedelta(days=1)
        except ValueError:
            raise ValidationFailedError("Format tanggal harus YYYY-MM-DD.")
        if end <= start:
            raise ValidationFailedError("Tanggal akhir harus setelah tanggal awal.")
    else:
        raise ValidationFailedError("Periode laporan tidak dikenali.")
    return (
        start.astimezone(timezone.utc).isoformat(),
        end.astimezone(timezone.utc).isoformat(),
        start.date().isoformat(),
        (end - timedelta(days=1)).date().isoformat(),
    )


def _window(start: str, end: str) -> Dict[str, Any]:
    return {"created_at": {"$gte": start, "$lt": end}}


async def _aggregate(collection: str, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [doc async for doc in get_db()[collection].aggregate(pipeline)]


async def _summary(start: str, end: str) -> Dict[str, Any]:
    window = _window(start, end)
    counted = {**window, **COUNTED_MATCH}
    totals = await _aggregate(
        Collections.ORDERS,
        [
            {"$match": counted},
            {
                "$group": {
                    "_id": None,
                    "gross_sales": {"$sum": "$subtotal"},
                    "shipping_amount": {"$sum": {"$ifNull": ["$shipping_cost", 0]}},
                    "cod_fee": {"$sum": {"$ifNull": ["$cod_fee", 0]}},
                    "orders": {"$sum": 1},
                    "items_sold": {"$sum": {"$sum": "$items.quantity"}},
                }
            },
        ],
    )
    base = totals[0] if totals else {}
    status_rows = await _aggregate(
        Collections.ORDERS,
        [{"$match": window}, {"$group": {"_id": "$order_status", "count": {"$sum": 1}, "amount": {"$sum": "$total"}}}, {"$sort": {"count": -1}}],
    )
    status_map = {row["_id"]: row["count"] for row in status_rows}
    refund_rows = await _aggregate(
        Collections.REFUNDS,
        [
            {"$match": window},
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "amount": {"$sum": {"$ifNull": ["$refunded_amount", "$amount"]}},
                }
            },
        ],
    )
    refund_map = {row["_id"]: row for row in refund_rows}
    total_refund = int((refund_map.get("COMPLETED") or {}).get("amount") or 0)
    payment_rows = await _aggregate(
        Collections.ORDERS,
        [
            {"$match": window},
            {
                "$group": {
                    "_id": {"$ifNull": ["$payment_method_choice", "MIDTRANS"]},
                    "orders": {"$sum": 1},
                    "amount": {"$sum": "$total"},
                    "completed": {"$sum": {"$cond": [{"$eq": ["$order_status", "COMPLETED"]}, 1, 0]}},
                    "cancelled": {"$sum": {"$cond": [{"$eq": ["$order_status", "CANCELLED"]}, 1, 0]}},
                    "refunded": {"$sum": {"$cond": [{"$eq": ["$order_status", "REFUNDED"]}, 1, 0]}},
                }
            },
        ],
    )
    gross = int(base.get("gross_sales") or 0)
    shipping_amount = int(base.get("shipping_amount") or 0)
    cod_fee = int(base.get("cod_fee") or 0)
    payment_map = {row["_id"]: row for row in payment_rows}
    return {
        "gross_sales": gross,
        "shipping_amount": shipping_amount,
        "cod_fee": cod_fee,
        "total_refund": total_refund,
        "net_sales": gross + shipping_amount + cod_fee - total_refund,
        "counted_orders": int(base.get("orders") or 0),
        "items_sold": int(base.get("items_sold") or 0),
        "total_orders": sum(status_map.values()),
        "status_breakdown": [
            {"status": row["_id"], "count": row["count"], "amount": int(row["amount"] or 0)}
            for row in status_rows
        ],
        "orders_by_status": {
            key: status_map.get(key, 0)
            for key in (
                "PENDING",
                "PROCESSING",
                "PACKED",
                "READY_TO_SHIP",
                "SHIPPED",
                "COMPLETED",
                "REJECTED",
                "CANCELLED",
                "REFUNDED",
            )
        },
        "payment_methods": [
            {
                "method": key,
                "orders": (payment_map.get(key) or {}).get("orders", 0),
                "amount": int((payment_map.get(key) or {}).get("amount") or 0),
                "completed": (payment_map.get(key) or {}).get("completed", 0),
                "cancelled": (payment_map.get(key) or {}).get("cancelled", 0),
                "refunded": (payment_map.get(key) or {}).get("refunded", 0),
            }
            for key in ("MIDTRANS", "COD")
        ],
        "refunds": {
            "total_requests": sum(row["count"] for row in refund_rows),
            "by_status": {
                key: {
                    "count": (refund_map.get(key) or {}).get("count", 0),
                    "amount": int((refund_map.get(key) or {}).get("amount") or 0),
                }
                for key in ("REQUESTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "FAILED")
            },
            "total_amount": total_refund,
        },
    }


async def _trend(start: str, end: str, granularity: str) -> List[Dict[str, Any]]:
    length = {"day": 10, "week": 10, "month": 7}.get(granularity, 10)
    pipeline = [
        {"$match": {**_window(start, end), **COUNTED_MATCH}},
        {
            "$group": {
                # created_at ISO UTC → +7 jam agar bucket mengikuti WIB.
                "_id": {
                    "$substrBytes": [
                        {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": {"$add": [{"$toDate": "$created_at"}, 7 * 60 * 60 * 1000]},
                            }
                        },
                        0,
                        length if granularity != "week" else 10,
                    ]
                },
                "gross_sales": {"$sum": "$subtotal"},
                "shipping_amount": {"$sum": {"$ifNull": ["$shipping_cost", 0]}},
                "orders": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    rows = await _aggregate(Collections.ORDERS, pipeline)
    if granularity == "week":
        buckets: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            day = datetime.fromisoformat(row["_id"])
            key = (day - timedelta(days=day.weekday())).date().isoformat()
            bucket = buckets.setdefault(key, {"bucket": key, "gross_sales": 0, "shipping_amount": 0, "orders": 0})
            bucket["gross_sales"] += int(row["gross_sales"] or 0)
            bucket["shipping_amount"] += int(row["shipping_amount"] or 0)
            bucket["orders"] += row["orders"]
        return sorted(buckets.values(), key=lambda b: b["bucket"])
    return [
        {
            "bucket": row["_id"],
            "gross_sales": int(row["gross_sales"] or 0),
            "shipping_amount": int(row["shipping_amount"] or 0),
            "orders": row["orders"],
        }
        for row in rows
    ]


async def _products(start: str, end: str, sort_by: str) -> List[Dict[str, Any]]:
    sort_field = "gross_sales" if sort_by == "revenue" else "quantity"
    rows = await _aggregate(
        Collections.ORDERS,
        [
            {"$match": {**_window(start, end), **COUNTED_MATCH}},
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": {"product_id": "$items.product_id", "variant": "$items.variant_name", "name": "$items.product_name"},
                    "quantity": {"$sum": "$items.quantity"},
                    "gross_sales": {"$sum": "$items.subtotal"},
                    "refund_quantity": {
                        "$sum": {"$cond": [{"$eq": ["$order_status", "REFUNDED"]}, "$items.quantity", 0]}
                    },
                    "refund_amount": {
                        "$sum": {"$cond": [{"$eq": ["$order_status", "REFUNDED"]}, "$items.subtotal", 0]}
                    },
                }
            },
            {"$sort": {sort_field: -1}},
            {"$limit": 100},
        ],
    )
    return [
        {
            "product_id": row["_id"]["product_id"],
            "product_name": row["_id"]["name"],
            "variant_name": row["_id"].get("variant"),
            "quantity": row["quantity"],
            "gross_sales": int(row["gross_sales"] or 0),
            "refund_quantity": row["refund_quantity"],
            "net_sales": int(row["gross_sales"] or 0) - int(row["refund_amount"] or 0),
        }
        for row in rows
    ]


async def _categories(start: str, end: str) -> List[Dict[str, Any]]:
    rows = await _aggregate(
        Collections.ORDERS,
        [
            {"$match": {**_window(start, end), **COUNTED_MATCH}},
            {"$unwind": "$items"},
            {
                "$lookup": {
                    "from": Collections.PRODUCTS,
                    "localField": "items.product_id",
                    "foreignField": "id",
                    "as": "product",
                }
            },
            {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": Collections.PRODUCT_CATEGORIES,
                    "localField": "product.category_id",
                    "foreignField": "id",
                    "as": "category",
                }
            },
            {"$unwind": {"path": "$category", "preserveNullAndEmptyArrays": True}},
            {
                "$group": {
                    "_id": {"$ifNull": ["$category.name", "Tanpa Kategori"]},
                    "items_sold": {"$sum": "$items.quantity"},
                    "gross_sales": {"$sum": "$items.subtotal"},
                    "refund_amount": {
                        "$sum": {"$cond": [{"$eq": ["$order_status", "REFUNDED"]}, "$items.subtotal", 0]}
                    },
                }
            },
            {"$sort": {"gross_sales": -1}},
        ],
    )
    return [
        {
            "category": row["_id"],
            "items_sold": row["items_sold"],
            "gross_sales": int(row["gross_sales"] or 0),
            "net_sales": int(row["gross_sales"] or 0) - int(row["refund_amount"] or 0),
        }
        for row in rows
    ]


async def _shipping(start: str, end: str) -> List[Dict[str, Any]]:
    rows = await _aggregate(
        Collections.ORDERS,
        [
            {"$match": {**_window(start, end), **COUNTED_MATCH}},
            {
                "$group": {
                    "_id": {
                        "courier": {"$ifNull": ["$fulfilment.courier_code", {"$ifNull": ["$shipping.courier_code", "—"]}]},
                        "service": {"$ifNull": ["$fulfilment.service_code", {"$ifNull": ["$shipping.service_code", "—"]}]},
                    },
                    "shipments": {"$sum": 1},
                    "shipping_amount": {"$sum": {"$ifNull": ["$shipping_cost", 0]}},
                    "cod_shipments": {"$sum": {"$cond": [{"$eq": ["$payment_method_choice", "COD"]}, 1, 0]}},
                    "cod_fee": {"$sum": {"$ifNull": ["$cod_fee", 0]}},
                }
            },
            {"$sort": {"shipments": -1}},
        ],
    )
    return [
        {
            "courier": row["_id"]["courier"],
            "service": row["_id"]["service"],
            "shipments": row["shipments"],
            "shipping_amount": int(row["shipping_amount"] or 0),
            "cod_shipments": row["cod_shipments"],
            "cod_fee": int(row["cod_fee"] or 0),
        }
        for row in rows
    ]


DEFINITIONS = {
    "counted_orders": "Pesanan yang dihitung sebagai penjualan: status bukan PENDING/CANCELLED dan pembayaran PAID atau metode COD.",
    "gross_sales": "Jumlah subtotal barang pesanan terhitung (harga snapshot saat pesanan dibuat).",
    "shipping_amount": "Jumlah biaya kirim (ongkir) pesanan terhitung.",
    "cod_fee": "Jumlah biaya COD pesanan terhitung (nilai resmi dari penyedia ongkir).",
    "total_refund": "Jumlah nominal refund berstatus COMPLETED pada rentang tanggal yang sama.",
    "net_sales": "Gross Sales + Ongkir + Biaya COD − Total Refund.",
}


@router.get("/sales", summary="Laporan penjualan (ringkasan, tren, status, pembayaran, refund)")
async def sales_report(
    period: str = Query("this_month"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    user: AuthContext = report_read,
) -> Dict[str, Any]:
    start, end, label_from, label_to = _range(period, date_from, date_to)
    return {
        "period": {"period": period, "from": label_from, "to": label_to, "timezone": "Asia/Jakarta (UTC+7)"},
        "summary": await _summary(start, end),
        "trend": {"granularity": granularity, "points": await _trend(start, end, granularity)},
        "shipping": await _shipping(start, end),
        "definitions": DEFINITIONS,
    }


@router.get("/sales/products", summary="Laporan penjualan per produk & varian")
async def product_report(
    period: str = Query("this_month"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = Query("quantity", pattern="^(quantity|revenue)$"),
    user: AuthContext = report_read,
) -> Dict[str, Any]:
    start, end, label_from, label_to = _range(period, date_from, date_to)
    return {
        "period": {"from": label_from, "to": label_to},
        "items": await _products(start, end, sort_by),
        "categories": await _categories(start, end),
    }


@router.get("/sales/export.csv", summary="Ekspor CSV laporan penjualan (mengikuti filter aktif)")
async def export_sales_csv(
    period: str = Query("this_month"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: AuthContext = report_read,
) -> StreamingResponse:
    """CSV hanya memuat angka penjualan — tanpa kredensial/secret apa pun."""
    start, end, label_from, label_to = _range(period, date_from, date_to)
    summary = await _summary(start, end)
    products = await _products(start, end, "revenue")
    categories = await _categories(start, end)
    shipping = await _shipping(start, end)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Laporan Penjualan AL SABBAT", f"{label_from} s/d {label_to}", "Asia/Jakarta (UTC+7)"])
    writer.writerow([])
    writer.writerow(["RINGKASAN", "Nilai"])
    for key in ("gross_sales", "shipping_amount", "cod_fee", "total_refund", "net_sales", "counted_orders", "total_orders", "items_sold"):
        writer.writerow([key, summary[key]])
    writer.writerow([])
    writer.writerow(["STATUS PESANAN", "Jumlah"])
    for status, count in summary["orders_by_status"].items():
        writer.writerow([status, count])
    writer.writerow([])
    writer.writerow(["METODE PEMBAYARAN", "Pesanan", "Nilai", "Selesai", "Dibatalkan", "Refund"])
    for row in summary["payment_methods"]:
        writer.writerow([row["method"], row["orders"], row["amount"], row["completed"], row["cancelled"], row["refunded"]])
    writer.writerow([])
    writer.writerow(["PRODUK", "Varian", "Qty", "Gross", "Qty Refund", "Net"])
    for row in products:
        writer.writerow([row["product_name"], row["variant_name"] or "-", row["quantity"], row["gross_sales"], row["refund_quantity"], row["net_sales"]])
    writer.writerow([])
    writer.writerow(["KATEGORI", "Item Terjual", "Gross", "Net"])
    for row in categories:
        writer.writerow([row["category"], row["items_sold"], row["gross_sales"], row["net_sales"]])
    writer.writerow([])
    writer.writerow(["KURIR", "Layanan", "Kiriman", "Ongkir", "Kiriman COD", "Biaya COD"])
    for row in shipping:
        writer.writerow([row["courier"], row["service"], row["shipments"], row["shipping_amount"], row["cod_shipments"], row["cod_fee"]])
    writer.writerow([])
    writer.writerow(["REFUND", "Jumlah", "Nominal"])
    for status, data in summary["refunds"]["by_status"].items():
        writer.writerow([status, data["count"], data["amount"]])

    buffer.seek(0)
    filename = f"laporan-penjualan-{label_from}_{label_to}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
