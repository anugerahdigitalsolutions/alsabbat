"""Homepage content management (Phase 15): hero banners + editable site copy."""
from __future__ import annotations

from typing import List, Optional

from pydantic import Field

from app.models.base import AppBaseModel, DBModel, make_update_model
from app.models.enums import EntityStatus


class BannerBase(AppBaseModel):
    eyebrow: Optional[str] = Field(default=None, max_length=120)
    headline_line_1: Optional[str] = Field(default=None, max_length=120)
    headline_line_2: Optional[str] = Field(default=None, max_length=120)
    headline_line_3: Optional[str] = Field(default=None, max_length=120)
    subheadline: Optional[str] = Field(default=None, max_length=200)
    meta: Optional[str] = Field(default=None, max_length=400)
    image_media_id: Optional[str] = Field(default=None, max_length=80)
    image_url: Optional[str] = Field(default=None, max_length=800)
    image_alt: Optional[str] = Field(default=None, max_length=300)
    cta_label: Optional[str] = Field(default=None, max_length=80)
    cta_url: Optional[str] = Field(default=None, max_length=400)
    cta_secondary_label: Optional[str] = Field(default=None, max_length=80)
    cta_secondary_url: Optional[str] = Field(default=None, max_length=400)
    image_position: Optional[str] = Field(default=None, max_length=20)
    overlay_opacity: Optional[float] = Field(default=None, ge=0, le=100)
    display_order: int = Field(default=0, ge=0, le=9999)
    starts_at: Optional[str] = Field(default=None, max_length=40)
    ends_at: Optional[str] = Field(default=None, max_length=40)
    status: EntityStatus = EntityStatus.INACTIVE


BannerUpdate = make_update_model("BannerUpdate", BannerBase)


class Banner(BannerBase, DBModel):
    pass


class SiteContentBase(AppBaseModel):
    key: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9._-]+$")
    value: Optional[str] = Field(default=None, max_length=2000)
    label: Optional[str] = Field(default=None, max_length=160)
    group: Optional[str] = Field(default=None, max_length=80)


SiteContentUpdate = make_update_model("SiteContentUpdate", SiteContentBase)


class SiteContent(SiteContentBase, DBModel):
    pass


class SiteContentBulkRequest(AppBaseModel):
    items: List[SiteContentBase] = Field(min_length=1, max_length=200)
