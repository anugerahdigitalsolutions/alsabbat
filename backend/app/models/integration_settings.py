"""Integration settings (Merchandise Fase 1) — definisi + validasi.

Hanya METADATA & validasi. Nilai rahasia disimpan di koleksi khusus
`integration_settings` (lihat app/services/integration_settings.py) dan TIDAK
pernah dikembalikan dalam bentuk plaintext ke frontend.

Catatan: tidak ada pemanggilan Midtrans/RajaOngkir di fase ini. Modul ini hanya
menyiapkan konfigurasi agar fase pengiriman berikutnya bisa memakainya.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.core.errors import ValidationFailedError
from app.models.base import AppBaseModel

# --------------------------------------------------------------- definitions
GROUP_MIDTRANS = "MIDTRANS"
GROUP_RAJAONGKIR = "RAJAONGKIR"
GROUP_SHIPPING_ORIGIN = "SHIPPING_ORIGIN"

GROUP_LABELS = {
    GROUP_MIDTRANS: "Midtrans (Pembayaran)",
    GROUP_RAJAONGKIR: "RajaOngkir / Komerce (Pengiriman)",
    GROUP_SHIPPING_ORIGIN: "Alamat Asal Pengiriman",
}

# type: SECRET (write-only, selalu di-mask) | TEXT | BOOL | INT | LAT | LONG | PHONE
SETTING_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "key": "MIDTRANS_SERVER_KEY",
        "group": GROUP_MIDTRANS,
        "label": "Server Key",
        "type": "SECRET",
        "help": "Midtrans Dashboard → Settings → Access Keys.",
    },
    {
        "key": "MIDTRANS_CLIENT_KEY",
        "group": GROUP_MIDTRANS,
        "label": "Client Key",
        "type": "SECRET",
        "help": "Dipakai untuk Snap di sisi klien pada fase berikutnya.",
    },
    {
        "key": "MIDTRANS_IS_PRODUCTION",
        "group": GROUP_MIDTRANS,
        "label": "Mode Produksi",
        "type": "BOOL",
        "help": "Nonaktif = Sandbox. Jangan aktifkan sebelum key produksi terpasang.",
    },
    {
        "key": "RAJAONGKIR_COST_API_KEY",
        "group": GROUP_RAJAONGKIR,
        "label": "Shipping Cost API Key",
        "type": "SECRET",
        "help": "Key untuk cek tarif & pencarian tujuan (selalu live).",
    },
    {
        "key": "RAJAONGKIR_DELIVERY_API_KEY",
        "group": GROUP_RAJAONGKIR,
        "label": "Delivery API Key",
        "type": "SECRET",
        "help": "Key terpisah untuk pembuatan order/AWB & COD (butuh paket Enterprise).",
    },
    {
        "key": "SHIPPING_ORIGIN_DESTINATION_ID",
        "group": GROUP_SHIPPING_ORIGIN,
        "label": "Origin Destination ID",
        "type": "INT",
        "help": "ID tujuan RajaOngkir untuk lokasi gudang/klub.",
    },
    {
        "key": "SHIPPING_ORIGIN_PINPOINT_LAT",
        "group": GROUP_SHIPPING_ORIGIN,
        "label": "Latitude",
        "type": "LAT",
        "help": "-90 s/d 90.",
    },
    {
        "key": "SHIPPING_ORIGIN_PINPOINT_LONG",
        "group": GROUP_SHIPPING_ORIGIN,
        "label": "Longitude",
        "type": "LONG",
        "help": "-180 s/d 180.",
    },
    {
        "key": "SHIPPING_ORIGIN_NAME",
        "group": GROUP_SHIPPING_ORIGIN,
        "label": "Nama Pengirim",
        "type": "TEXT",
    },
    {
        "key": "SHIPPING_ORIGIN_PHONE",
        "group": GROUP_SHIPPING_ORIGIN,
        "label": "Telepon Pengirim",
        "type": "PHONE",
        "help": "Format 08xxxx atau 62xxxx (tanpa +62) sesuai syarat Komerce.",
    },
]

DEFINITION_BY_KEY: Dict[str, Dict[str, Any]] = {item["key"]: item for item in SETTING_DEFINITIONS}
SECRET_KEYS = {item["key"] for item in SETTING_DEFINITIONS if item["type"] == "SECRET"}

PHONE_RE = re.compile(r"^(0|62)\d{7,14}$")
MAX_VALUE_LENGTH = 300


class IntegrationSettingsSave(AppBaseModel):
    """Hanya key yang dikirim yang diubah.

    - key tidak dikirim  → nilai lama dipertahankan (penting: input rahasia di UI
      selalu kosong karena plaintext tidak pernah dikembalikan).
    - nilai string kosong → hapus setting (kembali ke env/NOT CONFIGURED).
    """

    values: Dict[str, str] = Field(min_length=1)


def mask_value(value: Optional[str]) -> Optional[str]:
    """Tampilan aman: hanya 4 karakter terakhir yang terlihat."""
    if not value:
        return None
    tail = value[-4:] if len(value) > 4 else ""
    return "•" * 12 + tail


def normalise_value(key: str, raw: Any) -> Optional[str]:
    """Validasi + normalisasi. `None` berarti hapus setting.

    Pesan error TIDAK pernah menyertakan nilai yang dikirim.
    """
    definition = DEFINITION_BY_KEY.get(key)
    if not definition:
        raise ValidationFailedError(f"Setting tidak dikenal: {key}")

    value = "" if raw is None else str(raw).strip()
    if not value:
        return None

    label = definition["label"]
    kind = definition["type"]

    if len(value) > MAX_VALUE_LENGTH:
        raise ValidationFailedError(f"{label} terlalu panjang (maks {MAX_VALUE_LENGTH} karakter).")
    if "\n" in value or "\r" in value:
        raise ValidationFailedError(f"{label} tidak boleh berisi baris baru.")

    if kind in {"SECRET", "TEXT"}:
        return value

    if kind == "BOOL":
        low = value.lower()
        if low in {"1", "true", "yes", "on"}:
            return "true"
        if low in {"0", "false", "no", "off"}:
            return "false"
        raise ValidationFailedError(f"{label} harus true atau false.")

    if kind == "INT":
        if not value.isdigit():
            raise ValidationFailedError(f"{label} harus berupa angka bulat >= 0.")
        return str(int(value))

    if kind in {"LAT", "LONG"}:
        try:
            number = float(value)
        except ValueError:
            raise ValidationFailedError(f"{label} harus berupa angka desimal.")
        limit = 90.0 if kind == "LAT" else 180.0
        if number < -limit or number > limit:
            raise ValidationFailedError(f"{label} harus di antara -{limit:g} dan {limit:g}.")
        return f"{number:.6f}".rstrip("0").rstrip(".")

    if kind == "PHONE":
        digits = re.sub(r"[\s\-().]", "", value)
        if digits.startswith("+62"):
            digits = "62" + digits[3:]
        elif digits.startswith("+"):
            digits = digits[1:]
        if not PHONE_RE.match(digits):
            raise ValidationFailedError(
                f"{label} harus format 08xxxxxxxxx atau 62xxxxxxxxx (tanpa +62)."
            )
        return digits

    raise ValidationFailedError(f"Tipe setting tidak didukung untuk {label}.")
