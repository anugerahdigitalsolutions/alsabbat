"""Phase 9 — Merchandise & Commerce models (additive)."""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import Field, field_validator, model_validator

from app.models.base import AppBaseModel, make_update_model, slugify


class ProductStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    # Fase 3 — langkah fulfilment tambahan (additive, pesanan lama tetap valid).
    PACKED = "PACKED"
    READY_TO_SHIP = "READY_TO_SHIP"
    SHIPPED = "SHIPPED"
    COMPLETED = "COMPLETED"
    # Fase 5 — pelanggan menolak barang saat diterima (masuk workflow refund).
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class PaymentMethodChoice(str, Enum):
    """Metode pembayaran yang dipilih pelanggan (Fase 4)."""

    MIDTRANS = "MIDTRANS"
    COD = "COD"


class RefundStatus(str, Enum):
    """Lifecycle refund (Fase 6)."""

    REQUESTED = "REQUESTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    REFUNDED = "REFUNDED"


class ProductCategoryBase(AppBaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=600)
    status: ProductStatus = ProductStatus.ACTIVE
    display_order: int = Field(default=0, ge=0, le=9999)

    @field_validator("slug", mode="before")
    @classmethod
    def _slug(cls, value, info):
        return slugify(value) if value else value

    # A `field_validator` never runs when the caller omits `slug`, because
    # Pydantic v2 does not validate default values. Without this the slug stayed
    # None and the public URL became /merchandise/null. Mirrors the same guard
    # used by every slugged model in app/models/domain.py.
    @model_validator(mode="after")
    def _ensure_slug(self):
        if not getattr(self, "slug", None):
            object.__setattr__(self, "slug", slugify(getattr(self, "name", "") or ""))
        return self


class ProductBase(AppBaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=4000)
    short_description: Optional[str] = Field(default=None, max_length=300)
    category_id: Optional[str] = None
    status: ProductStatus = ProductStatus.DRAFT
    price: int = Field(default=0, ge=0)  # smallest currency unit (IDR rupiah)
    compare_at_price: Optional[int] = Field(default=None, ge=0)
    currency: str = Field(default="IDR", max_length=3)
    sku: Optional[str] = Field(default=None, max_length=60)
    stock_quantity: int = Field(default=0, ge=0)  # used when product has no variants
    # --- Data pengiriman (Merchandise Fase 1) -----------------------------
    # Opsional & nullable: produk lama tanpa data ini tetap valid dan tidak
    # diberi nilai default palsu. Belum dipakai untuk kalkulasi apa pun.
    weight_grams: Optional[int] = Field(default=None, ge=0, le=1_000_000)
    length_cm: Optional[float] = Field(default=None, ge=0, le=500)
    width_cm: Optional[float] = Field(default=None, ge=0, le=500)
    height_cm: Optional[float] = Field(default=None, ge=0, le=500)
    cover_media_id: Optional[str] = None
    media_ids: List[str] = Field(default_factory=list, max_length=12)
    display_order: int = Field(default=0, ge=0, le=9999)

    @field_validator("slug", mode="before")
    @classmethod
    def _slug(cls, value, info):
        return slugify(value) if value else value

    # See ProductCategoryBase._ensure_slug — without this a product created
    # without an explicit slug kept slug=None, so the storefront linked to
    # /merchandise/null and the detail page returned "Product not found".
    @model_validator(mode="after")
    def _ensure_slug(self):
        if not getattr(self, "slug", None):
            object.__setattr__(self, "slug", slugify(getattr(self, "name", "") or ""))
        return self


class ProductVariantBase(AppBaseModel):
    product_id: str
    name: str = Field(min_length=1, max_length=80)
    sku: Optional[str] = Field(default=None, max_length=60)
    price_override: Optional[int] = Field(default=None, ge=0)
    # Berat khusus varian (opsional). Bila kosong, berat produk yang dipakai.
    weight_grams: Optional[int] = Field(default=None, ge=0, le=1_000_000)
    stock_quantity: int = Field(default=0, ge=0)
    status: ProductStatus = ProductStatus.ACTIVE
    display_order: int = Field(default=0, ge=0, le=9999)


class CheckoutItem(AppBaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(ge=1, le=50)


class CustomerInfo(AppBaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    phone: str = Field(min_length=6, max_length=30)


class ShippingInfo(AppBaseModel):
    recipient: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=5, max_length=400)
    city: str = Field(min_length=2, max_length=120)
    province: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(min_length=3, max_length=12)
    notes: Optional[str] = Field(default=None, max_length=400)
    # --- Pengiriman RajaOngkir (Fase 2) ---------------------------------
    # Opsional agar pesanan lama & alur lama (saat ongkir belum dikonfigurasi)
    # tetap valid. `shipping_cost` hanya PETUNJUK dari klien untuk mendeteksi
    # perubahan harga; harga yang dipakai selalu dihitung ulang di server.
    destination_id: Optional[str] = Field(default=None, max_length=24)
    destination_label: Optional[str] = Field(default=None, max_length=240)
    courier_code: Optional[str] = Field(default=None, max_length=24)
    courier_name: Optional[str] = Field(default=None, max_length=80)
    service_code: Optional[str] = Field(default=None, max_length=40)
    service_name: Optional[str] = Field(default=None, max_length=80)
    shipping_cost: Optional[int] = Field(default=None, ge=0)
    shipping_etd: Optional[str] = Field(default=None, max_length=40)


class ShippingQuoteRequest(AppBaseModel):
    """Permintaan hitung ongkir — hanya referensi keranjang + tujuan."""

    items: List["CheckoutItem"] = Field(min_length=1, max_length=30)
    destination_id: str = Field(min_length=1, max_length=24)
    couriers: Optional[List[str]] = Field(default=None, max_length=12)


class CheckoutRequest(AppBaseModel):
    items: List[CheckoutItem] = Field(min_length=1, max_length=30)
    customer: CustomerInfo
    shipping: ShippingInfo
    # Default MIDTRANS agar pesanan/klien lama tetap kompatibel.
    payment_method: PaymentMethodChoice = PaymentMethodChoice.MIDTRANS


class OrderRejectRequest(AppBaseModel):
    """Pelanggan menolak barang saat diterima (Fase 5)."""

    reason: str = Field(min_length=3, max_length=80)
    detail: str = Field(min_length=5, max_length=1000)
    evidence_urls: List[str] = Field(default_factory=list, max_length=5)


class RefundRequestCreate(AppBaseModel):
    reason: str = Field(min_length=3, max_length=80)
    detail: str = Field(min_length=5, max_length=1000)
    evidence_urls: List[str] = Field(default_factory=list, max_length=5)
    bank_account: Optional[str] = Field(default=None, max_length=120)


class RefundReview(AppBaseModel):
    decision: RefundStatus
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("decision")
    @classmethod
    def _decision(cls, value):
        if value not in (RefundStatus.APPROVED, RefundStatus.REJECTED, RefundStatus.UNDER_REVIEW):
            raise ValueError("Keputusan hanya boleh UNDER_REVIEW, APPROVED, atau REJECTED.")
        return value


class RefundManualTransfer(AppBaseModel):
    """Refund COD/manual — dicatat admin setelah transfer benar-benar dilakukan."""

    amount: int = Field(ge=1)
    transfer_reference: str = Field(min_length=3, max_length=120)
    transferred_at: Optional[str] = Field(default=None, max_length=40)
    note: Optional[str] = Field(default=None, max_length=500)


class OrderStatusUpdate(AppBaseModel):
    order_status: OrderStatus
    note: Optional[str] = Field(default=None, max_length=300)


class OrderFulfilmentUpdate(AppBaseModel):
    """Data pengiriman yang diisi admin (Fase 3).

    Disimpan terpisah dari snapshot checkout supaya histori pesanan tidak
    berubah. Semua field opsional agar admin bisa melengkapi bertahap, tetapi
    resi tidak boleh berupa string kosong.
    """

    courier_code: Optional[str] = Field(default=None, max_length=24)
    courier_name: Optional[str] = Field(default=None, max_length=80)
    service_code: Optional[str] = Field(default=None, max_length=40)
    service_name: Optional[str] = Field(default=None, max_length=80)
    awb_number: Optional[str] = Field(default=None, min_length=4, max_length=60)
    shipping_note: Optional[str] = Field(default=None, max_length=300)

    @field_validator("awb_number", "courier_code", "service_code", mode="before")
    @classmethod
    def _trim(cls, value):
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed or None
        return value


ProductCategoryUpdate = make_update_model("ProductCategoryUpdate", ProductCategoryBase)
ProductUpdate = make_update_model("ProductUpdate", ProductBase)
ProductVariantUpdate = make_update_model("ProductVariantUpdate", ProductVariantBase)
