"""Shared model primitives."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from pydantic import BaseModel, ConfigDict, Field, create_model


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    return value.strip("-") or new_id()[:8]


class AppBaseModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)


class DBModel(AppBaseModel):
    """Every persisted document carries a UUID string id + timestamps."""

    id: str = Field(default_factory=new_id)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class SocialLinks(AppBaseModel):
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None
    website: Optional[str] = None


class ContactInformation(AppBaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None


class SeoMeta(AppBaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    og_image: Optional[str] = None
    canonical_url: Optional[str] = None


T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: List[T]
    total: int
    limit: int
    skip: int


def make_update_model(name: str, base: Type[BaseModel]) -> Type[BaseModel]:
    """Derive a PATCH model where every field of `base` is optional."""
    fields: Dict[str, Any] = {}
    for field_name, field in base.model_fields.items():
        annotation = field.annotation
        fields[field_name] = (Optional[annotation], None)
    return create_model(name, __base__=AppBaseModel, **fields)  # type: ignore[call-overload]
