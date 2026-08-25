"""Website publisher — reuses the existing Content/Post system (no new CMS)."""
from __future__ import annotations

from typing import Any, Dict, List

from app.api.crud_factory import Repository
from app.core.config import settings
from app.core.database import Collections
from app.models.social import SocialConnectionStatus, SocialPlatform
from app.services.social.base import PlatformConfig, PublishResult, SocialPublisher
from app.services.social.validation import validate_website

posts = Repository(Collections.POSTS)


class WebsitePublisher(SocialPublisher):
    platform = SocialPlatform.WEBSITE.value
    label = "Website ALSABBAT"
    official_api = "Internal Content/Post API (existing CMS)"

    def config(self) -> PlatformConfig:
        return PlatformConfig(
            platform=self.platform,
            label=self.label,
            connected=True,
            status=SocialConnectionStatus.CONNECTED.value,
            requirements=["Berita/post sudah dibuat pada modul Content"],
            missing_env=[],
            limitations=["Menggunakan status publikasi Post existing (PUBLISHED)"],
            official_api=self.official_api,
        )

    def validate(self, publication: Dict[str, Any], media: List[Dict[str, Any]]) -> None:
        validate_website(publication)

    async def publish(
        self, publication: Dict[str, Any], media: List[Dict[str, Any]]
    ) -> PublishResult:
        post = await posts.get(publication["post_id"])
        if not post:
            return PublishResult(
                success=False,
                error_code="POST_NOT_FOUND",
                error_message="Post tidak ditemukan pada CMS.",
            )
        if post.get("status") != "PUBLISHED":
            updated = await posts.update(post["id"], {"status": "PUBLISHED"})
            post = updated or post
        base = (settings.PUBLIC_SITE_URL or "").rstrip("/")
        slug = post.get("slug") or ""
        return PublishResult(
            success=True,
            external_post_id=post["id"],
            external_url=f"{base}/news/{slug}" if base and slug else None,
        )
