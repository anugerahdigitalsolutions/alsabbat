"""Phase 8 — Social Publishing models (additive, separate from Content/Post)."""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import Field

from app.models.base import AppBaseModel, make_update_model


class SocialPlatform(str, Enum):
    WEBSITE = "WEBSITE"
    INSTAGRAM = "INSTAGRAM"
    TIKTOK = "TIKTOK"
    YOUTUBE = "YOUTUBE"
    YOUTUBE_SHORTS = "YOUTUBE_SHORTS"


class SocialPublicationStatus(str, Enum):
    DRAFT = "DRAFT"
    QUEUED = "QUEUED"
    PUBLISHING = "PUBLISHING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class SocialConnectionStatus(str, Enum):
    CONNECTED = "CONNECTED"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    EXPIRED = "EXPIRED"
    REQUIRES_REAUTH = "REQUIRES_REAUTH"
    REQUIRES_APPROVAL = "REQUIRES_APPROVAL"


class YouTubeVisibility(str, Enum):
    PRIVATE = "private"
    UNLISTED = "unlisted"
    PUBLIC = "public"


class SocialPublicationBase(AppBaseModel):
    """One publication attempt for exactly one platform."""

    platform: SocialPlatform
    status: SocialPublicationStatus = SocialPublicationStatus.DRAFT
    post_id: Optional[str] = None
    match_id: Optional[str] = None
    media_ids: List[str] = Field(default_factory=list, max_length=20)
    caption: str = Field(default="", max_length=2200)
    title: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=5000)
    tags: List[str] = Field(default_factory=list, max_length=30)
    visibility: YouTubeVisibility = YouTubeVisibility.PRIVATE
    # Result (never contains credentials)
    external_post_id: Optional[str] = None
    external_url: Optional[str] = None
    published_at: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = Field(default=None, max_length=800)
    attempt_count: int = Field(default=0, ge=0, le=50)
    created_by: Optional[str] = None


SocialPublicationUpdate = make_update_model("SocialPublicationUpdate", SocialPublicationBase)


class SocialPublicationCreate(AppBaseModel):
    """Admin selects platforms explicitly — nothing is checked by default."""

    platforms: List[SocialPlatform] = Field(min_length=1, max_length=5)
    post_id: Optional[str] = None
    match_id: Optional[str] = None
    media_ids: List[str] = Field(default_factory=list, max_length=20)
    caption: str = Field(default="", max_length=2200)
    title: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=5000)
    tags: List[str] = Field(default_factory=list, max_length=30)
    visibility: YouTubeVisibility = YouTubeVisibility.PRIVATE


class SocialPlatformSettings(AppBaseModel):
    """Fase 4 — aktif/nonaktifkan platform sosial (tanpa menyentuh kredensial)."""

    enabled: bool
