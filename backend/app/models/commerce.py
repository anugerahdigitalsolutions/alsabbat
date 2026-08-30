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
    SHIPPED = "SHIPPED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


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


class CheckoutRequest(AppBaseModel):
    items: List[CheckoutItem] = Field(min_length=1, max_length=30)
    customer: CustomerInfo
    shipping: ShippingInfo


class OrderStatusUpdate(AppBaseModel):
    order_status: OrderStatus


ProductCategoryUpdate = make_update_model("ProductCategoryUpdate", ProductCategoryBase)
ProductUpdate = make_update_model("ProductUpdate", ProductBase)
ProductVariantUpdate = make_update_model("ProductVariantUpdate", ProductVariantBase)
