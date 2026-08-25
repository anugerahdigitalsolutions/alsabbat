"""Publisher registry — one adapter per platform."""
from __future__ import annotations

from typing import Dict, List

from app.models.social import SocialPlatform
from app.services.social.base import PlatformConfig, SocialPublisher
from app.services.social.instagram import InstagramPublisher
from app.services.social.tiktok import TikTokPublisher
from app.services.social.website import WebsitePublisher
from app.services.social.youtube import YouTubePublisher, YouTubeShortsPublisher

_PUBLISHERS: Dict[str, SocialPublisher] = {
    SocialPlatform.WEBSITE.value: WebsitePublisher(),
    SocialPlatform.INSTAGRAM.value: InstagramPublisher(),
    SocialPlatform.TIKTOK.value: TikTokPublisher(),
    SocialPlatform.YOUTUBE.value: YouTubePublisher(),
    SocialPlatform.YOUTUBE_SHORTS.value: YouTubeShortsPublisher(),
}


def get_publisher(platform: str) -> SocialPublisher:
    publisher = _PUBLISHERS.get(platform)
    if publisher is None:
        raise KeyError(platform)
    return publisher


def platform_configs() -> List[PlatformConfig]:
    return [publisher.config() for publisher in _PUBLISHERS.values()]
