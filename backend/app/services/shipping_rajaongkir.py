"""RajaOngkir (Komerce) Shipping Cost API — Merchandise Fase 2.

HANYA server-to-server. API key TIDAK pernah dikirim ke frontend dan TIDAK
pernah masuk log. Kredensial diambil dari Integration Settings Fase 1 dengan
prioritas: Admin setting -> environment variable -> NOT CONFIGURED.

Cakupan fase ini: pencarian tujuan domestik + kalkulasi ongkir reguler.
TIDAK termasuk COD, Delivery/Order API, AWB, maupun tracking.

Satuan: berat produk disimpan dalam GRAM di database. API domestic-cost
RajaOngkir juga memakai gram, jadi konversi dilakukan tepat di batas integrasi
ini (lihat `_grams_for_api`) supaya unit internal tidak pernah berubah.
"""
from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.errors import ValidationFailedError
from app.core.logging_config import get_logger
from app.services.integration_settings import ensure_fresh, resolve

logger = get_logger(__name__)

BASE_URL = "https://rajaongkir.komerce.id/api/v1"
TIMEOUT_SECONDS = 20.0
DEFAULT_COURIERS = ["jne", "sicepat", "jnt", "anteraja", "pos", "tiki", "ninja", "lion"]
MIN_SEARCH_LENGTH = 3
CACHE_TTL_SECONDS = 120
MAX_WEIGHT_GRAMS = 30_000

_cache: Dict[str, Any] = {}


def _api_key() -> str:
    key = resolve("RAJAONGKIR_COST_API_KEY")
    if not key:
        raise ValidationFailedError(
            "Kalkulasi ongkir belum aktif. Admin belum mengisi RajaOngkir Shipping Cost API Key."
        )
    return key


def origin_destination_id() -> str:
    origin = resolve("SHIPPING_ORIGIN_DESTINATION_ID")
    if not origin:
        raise ValidationFailedError(
            "Alamat asal pengiriman belum diatur. Admin belum mengisi Origin Destination ID."
        )
    return str(origin)


def is_configured() -> bool:
    return bool(resolve("RAJAONGKIR_COST_API_KEY") and resolve("SHIPPING_ORIGIN_DESTINATION_ID"))


def status() -> Dict[str, Any]:
    """Status konfigurasi TANPA nilai rahasia (aman untuk frontend)."""
    missing = [
        key
        for key in ("RAJAONGKIR_COST_API_KEY", "SHIPPING_ORIGIN_DESTINATION_ID")
        if not resolve(key)
    ]
    return {
        "provider": "RAJAONGKIR",
        "configured": not missing,
        "status": "SHIPPING_NOT_CONFIGURED" if missing else "READY",
        "missing_config": missing,
    }


def _grams_for_api(weight_grams: int) -> int:
    """Batas integrasi: API domestic-cost memakai gram (minimal 1 gram)."""
    return max(1, int(weight_grams))


async def _call(method: str, path: str, **kwargs) -> Dict[str, Any]:
    """Panggilan HTTP ke RajaOngkir dengan penanganan galat yang aman.

    Log hanya berisi path + status; TIDAK pernah key, alamat, atau body penuh.
    """
    headers = {"key": _api_key(), "accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.request(method, f"{BASE_URL}{path}", headers=headers, **kwargs)
    except httpx.TimeoutException:
        logger.warning("rajaongkir.timeout path=%s", path)
        raise ValidationFailedError(
            "Layanan ongkir sedang tidak merespons. Coba hitung ongkir lagi sebentar lagi."
        )
    except httpx.HTTPError as exc:
        logger.warning("rajaongkir.transport_error path=%s error=%s", path, type(exc).__name__)
        raise ValidationFailedError("Layanan ongkir tidak dapat dihubungi. Coba lagi sebentar lagi.")

    if response.status_code in (401, 403):
        logger.error("rajaongkir.unauthorized path=%s status=%s", path, response.status_code)
        raise ValidationFailedError(
            "Kredensial layanan ongkir tidak valid. Hubungi admin untuk memperbarui API key."
        )
    if response.status_code >= 400:
        logger.warning("rajaongkir.http_error path=%s status=%s", path, response.status_code)
        raise ValidationFailedError("Layanan ongkir menolak permintaan. Coba lagi sebentar lagi.")

    try:
        payload = response.json()
    except ValueError:
        logger.warning("rajaongkir.invalid_json path=%s", path)
        raise ValidationFailedError("Balasan layanan ongkir tidak dapat dibaca. Coba lagi.")

    if not isinstance(payload, dict):
        raise ValidationFailedError("Balasan layanan ongkir tidak dikenali. Coba lagi.")

    meta = payload.get("meta") or {}
    meta_status = meta.get("status")
    meta_code = meta.get("code")
    if (meta_status and str(meta_status).lower() != "success") or (
        meta_code and int(meta_code) >= 400
    ):
        logger.warning("rajaongkir.api_error path=%s code=%s", path, meta_code)
        raise ValidationFailedError("Layanan ongkir mengembalikan galat. Coba lagi sebentar lagi.")
    return payload


async def search_destinations(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Pencarian tujuan domestik. Hanya field yang dibutuhkan checkout."""
    keyword = (query or "").strip()
    if len(keyword) < MIN_SEARCH_LENGTH:
        raise ValidationFailedError(
            f"Kata kunci pencarian minimal {MIN_SEARCH_LENGTH} karakter."
        )
    await ensure_fresh()
    payload = await _call(
        "GET",
        "/destination/domestic-destination",
        params={"search": keyword, "limit": max(1, min(limit, 50)), "offset": 0},
    )
    rows = payload.get("data") or []
    items: List[Dict[str, Any]] = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict) or not row.get("id"):
            continue
        items.append(
            {
                "destination_id": str(row.get("id")),
                "label": row.get("label")
                or ", ".join(
                    part
                    for part in [
                        row.get("subdistrict_name"),
                        row.get("district_name"),
                        row.get("city_name"),
                        row.get("province_name"),
                    ]
                    if part
                ),
                "subdistrict": row.get("subdistrict_name"),
                "district": row.get("district_name"),
                "city": row.get("city_name"),
                "province": row.get("province_name"),
                "postal_code": str(row.get("zip_code") or "") or None,
            }
        )
    logger.info("rajaongkir.destination_search results=%s", len(items))
    return items


def _cod_capability(row: Dict[str, Any]) -> Dict[str, Any]:
    """Kapabilitas COD HANYA dari balasan API (tidak pernah dikarang).

    Bila penyedia tidak mengirim informasi COD (atau tidak mengirim biaya COD),
    layanan tersebut dianggap TIDAK mendukung COD dan alasannya dijelaskan —
    tanpa daftar kurir hardcoded dan tanpa biaya karangan.
    """
    raw = row.get("cod")
    if raw is None:
        raw = row.get("cod_available")
    supported: Optional[bool] = None
    if isinstance(raw, bool):
        supported = raw
    elif isinstance(raw, str):
        supported = raw.strip().upper() in {"YES", "Y", "TRUE", "1", "AVAILABLE"}
    fee_raw = row.get("cod_fee")
    if fee_raw is None:
        fee_raw = row.get("cod_service_fee")
    fee: Optional[int] = None
    try:
        if fee_raw is not None:
            fee = int(round(float(fee_raw)))
    except (TypeError, ValueError):
        fee = None
    fee_percent: Optional[float] = None
    percent_raw = row.get("cod_fee_percent") or row.get("cod_percent")
    try:
        if percent_raw is not None:
            fee_percent = float(percent_raw)
    except (TypeError, ValueError):
        fee_percent = None
    if supported is None:
        return {"cod_available": False, "cod_fee": None, "cod_fee_percent": None,
                "cod_note": "Penyedia ongkir tidak mengirim data kapabilitas COD untuk layanan ini."}
    if not supported:
        return {"cod_available": False, "cod_fee": None, "cod_fee_percent": None,
                "cod_note": "Layanan ini tidak mendukung COD menurut penyedia ongkir."}
    if fee is None and fee_percent is None:
        return {"cod_available": False, "cod_fee": None, "cod_fee_percent": None,
                "cod_note": "Penyedia ongkir tidak mengirim biaya COD, jadi COD tidak ditawarkan."}
    return {"cod_available": True, "cod_fee": fee, "cod_fee_percent": fee_percent, "cod_note": None}


def cod_fee_for(option: Dict[str, Any], subtotal: int) -> int:
    """Biaya COD dari nilai resmi penyedia (nominal menang atas persentase)."""
    if option.get("cod_fee") is not None:
        return max(0, int(option["cod_fee"]))
    percent = option.get("cod_fee_percent")
    if percent is None:
        raise ValidationFailedError("Biaya COD tidak tersedia dari penyedia ongkir.")
    return max(0, int(round(int(subtotal) * float(percent) / 100.0)))


def cod_status() -> Dict[str, Any]:
    """Status konfigurasi COD (tanpa rahasia) — dipakai checkout & admin."""
    missing = [
        key
        for key in ("RAJAONGKIR_COST_API_KEY", "SHIPPING_ORIGIN_DESTINATION_ID")
        if not resolve(key)
    ]
    delivery_missing = [] if resolve("RAJAONGKIR_DELIVERY_API_KEY") else ["RAJAONGKIR_DELIVERY_API_KEY"]
    return {
        "provider": "RAJAONGKIR",
        # Ketersediaan COD tetap ditentukan per layanan oleh API ongkir.
        "quote_configured": not missing,
        "shipment_configured": not delivery_missing,
        "configured": not missing and not delivery_missing,
        "status": "READY" if not missing and not delivery_missing else "COD_NOT_CONFIGURED",
        "missing_config": missing + delivery_missing,
    }


async def create_cod_shipment(order: Dict[str, Any], shipment: Dict[str, Any]) -> Dict[str, Any]:
    """Buat shipment COD lewat Delivery API resmi (butuh kunci Delivery terpisah).

    Tanpa kredensial Delivery API, fungsi ini TIDAK memalsukan respons: ia
    mengembalikan galat jujur sehingga status pesanan tidak pernah berubah
    seolah-olah paket sudah diserahkan ke kurir.
    """
    key = resolve("RAJAONGKIR_DELIVERY_API_KEY")
    if not key:
        raise ValidationFailedError(
            "Pembuatan pengiriman COD belum aktif. Admin belum mengisi RajaOngkir/Komerce "
            "Delivery API Key."
        )
    await ensure_fresh()
    payload = {
        "order_number": order["order_number"],
        "origin": origin_destination_id(),
        "destination": str((order.get("shipping") or {}).get("destination_id") or ""),
        "weight": _grams_for_api(int(order.get("shipment_weight_grams") or 0)),
        "courier": str(shipment.get("courier_code") or ""),
        "service": str(shipment.get("service_code") or ""),
        "cod_value": int(order.get("total") or 0),
        "receiver_name": (order.get("shipping") or {}).get("recipient"),
        "receiver_phone": (order.get("customer") or {}).get("phone"),
        "receiver_address": (order.get("shipping") or {}).get("address"),
    }
    headers = {"key": key, "accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(f"{BASE_URL}/delivery/order", headers=headers, data=payload)
    except httpx.HTTPError as exc:
        logger.warning("rajaongkir.cod_shipment_transport_error error=%s", type(exc).__name__)
        raise ValidationFailedError("Layanan pengiriman COD tidak dapat dihubungi. Coba lagi.")
    if response.status_code >= 400:
        logger.warning("rajaongkir.cod_shipment_http_error status=%s", response.status_code)
        raise ValidationFailedError(
            "Penyedia menolak pembuatan pengiriman COD. Periksa data pesanan lalu coba lagi."
        )
    try:
        body = response.json()
    except ValueError:
        raise ValidationFailedError("Balasan layanan pengiriman COD tidak dapat dibaca.")
    data = body.get("data") if isinstance(body, dict) else None
    data = data if isinstance(data, dict) else {}
    awb = str(data.get("awb") or data.get("waybill") or "").strip()
    if not awb:
        raise ValidationFailedError(
            "Penyedia tidak mengembalikan nomor resi COD, pengiriman dianggap gagal."
        )
    logger.info("rajaongkir.cod_shipment_created order=%s", order["order_number"])
    return {"awb_number": awb, "shipment_reference": str(data.get("order_no") or "") or None}


def _normalise_option(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    cost = row.get("cost")
    try:
        cost_value = int(round(float(cost)))
    except (TypeError, ValueError):
        return None
    if cost_value <= 0:
        return None
    courier_code = str(row.get("code") or "").strip().lower()
    service_code = str(row.get("service") or "").strip()
    if not courier_code or not service_code:
        return None
    return {
        "courier_code": courier_code,
        "courier_name": row.get("name") or courier_code.upper(),
        "service_code": service_code,
        "service_name": row.get("service") or service_code,
        "description": row.get("description") or None,
        "cost": cost_value,
        "etd": (str(row.get("etd")).strip() or None) if row.get("etd") is not None else None,
        "available": True,
        **_cod_capability(row),
    }


async def calculate_cost(
    destination_id: str, weight_grams: int, couriers: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Ongkir reguler dari origin (konfigurasi admin) ke `destination_id`."""
    destination = str(destination_id or "").strip()
    if not destination.isdigit():
        raise ValidationFailedError("Tujuan pengiriman belum dipilih dengan benar.")
    if weight_grams <= 0:
        raise ValidationFailedError("Berat kiriman tidak valid.")
    if weight_grams > MAX_WEIGHT_GRAMS:
        raise ValidationFailedError(
            "Berat kiriman melebihi batas layanan ongkir. Pisahkan menjadi beberapa pesanan."
        )

    await ensure_fresh()
    origin = origin_destination_id()
    courier_list = [c.strip().lower() for c in (couriers or DEFAULT_COURIERS) if c and c.strip()]
    cache_key = f"{origin}|{destination}|{_grams_for_api(weight_grams)}|{':'.join(sorted(courier_list))}"
    cached = _cache.get(cache_key)
    if cached and cached["expires_at"] > time.monotonic():
        return [dict(option) for option in cached["options"]]

    payload = await _call(
        "POST",
        "/calculate/domestic-cost",
        data={
            "origin": origin,
            "destination": destination,
            # Konversi satuan hanya di sini (internal tetap gram).
            "weight": _grams_for_api(weight_grams),
            "courier": ":".join(courier_list),
            "price": "lowest",
        },
    )
    rows = payload.get("data") or []
    if isinstance(rows, dict):
        rows = rows.get("calculate_domestic_cost") or rows.get("data") or []
    options = [opt for opt in (_normalise_option(r) for r in rows if isinstance(r, dict)) if opt]
    options.sort(key=lambda o: o["cost"])
    if not options:
        raise ValidationFailedError(
            "Tidak ada layanan pengiriman yang tersedia untuk tujuan dan berat ini."
        )
    _cache[cache_key] = {"options": [dict(o) for o in options], "expires_at": time.monotonic() + CACHE_TTL_SECONDS}
    if len(_cache) > 500:
        _cache.clear()
    logger.info(
        "rajaongkir.cost_calculated destination=%s weight_g=%s options=%s",
        destination,
        weight_grams,
        len(options),
    )
    return options


async def find_option(
    destination_id: str, weight_grams: int, courier_code: str, service_code: str
) -> Dict[str, Any]:
    """Ambil satu opsi yang dipilih pelanggan — sumber harga ongkir yang sah."""
    options = await calculate_cost(destination_id, weight_grams, [courier_code])
    wanted_courier = str(courier_code or "").strip().lower()
    wanted_service = str(service_code or "").strip().lower()
    for option in options:
        if (
            option["courier_code"] == wanted_courier
            and option["service_code"].strip().lower() == wanted_service
        ):
            return option
    raise ValidationFailedError(
        "Layanan pengiriman yang dipilih sudah tidak tersedia. Silakan hitung ongkir ulang."
    )
