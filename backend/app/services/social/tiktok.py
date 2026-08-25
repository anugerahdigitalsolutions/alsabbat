"""TikTok publisher — official Content Posting API (Direct Post / inbox upload).

Official flow: POST /v2/post/publish/video/init/ (Direct Post, scope video.publish)
or /v2/post/publish/inbox/video/init/ (scope video.upload) with
source PULL_FROM_URL (verified domain) -> poll /v2/post/publish/status/fetch/.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List

import httpx

from app.core.logging_config import get_logger
from app.models.social import SocialConnectionStatus, SocialPlatform
from app.services.social.base import PlatformConfig, PublishResult, SocialPublisher
from app.services.social.validation import public_media_url, validate_tiktok

logger = get_logger(__name__)

TIKTOK_BASE = "https://open.tiktokapis.com"
ENV_KEYS = ("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_ACCESS_TOKEN")


class TikTokPublisher(SocialPublisher):
    platform = SocialPlatform.TIKTOK.value
    label = "TikTok"
    official_api = "TikTok Content Posting API v2"

    def _creds(self) -> Dict[str, str]:
        return {key: os.environ.get(key, "") for key in ENV_KEYS}

    @staticmethod
    def _direct_post_approved() -> bool:
        return os.environ.get("TIKTOK_DIRECT_POST_APPROVED", "").lower() in {"1", "true", "yes"}

    def config(self) -> PlatformConfig:
        creds = self._creds()
        missing = [key for key, value in creds.items() if not value]
        if missing:
            status = SocialConnectionStatus.NOT_CONFIGURED.value
        elif not self._direct_post_approved():
            status = SocialConnectionStatus.REQUIRES_APPROVAL.value
        else:
            status = SocialConnectionStatus.CONNECTED.value
        return PlatformConfig(
            platform=self.platform,
            label=self.label,
            connected=status == SocialConnectionStatus.CONNECTED.value,
            status=status,
            requirements=[
                "TikTok Developer App dengan produk Content Posting API",
                "Scope video.publish (Direct Post) atau video.upload (inbox)",
                "Audit/approval TikTok untuk publish publik",
                "Domain URL media terverifikasi (URL properties) untuk PULL_FROM_URL",
                "TIKTOK_DIRECT_POST_APPROVED=true setelah app di-approve",
            ],
            missing_env=missing,
            limitations=[
                "Tanpa audit TikTok, postingan hanya bisa SELF_ONLY dan dibatasi 5 user/24 jam",
                "Video maksimal 4 GB dan 10 menit; hanya MP4/MOV/WebM",
                "Publish bersifat asinkron — status akhir diambil dari status/fetch",
            ],
            official_api=self.official_api,
        )

    def validate(self, publication: Dict[str, Any], media: List[Dict[str, Any]]) -> None:
        validate_tiktok(media)

    async def publish(
        self, publication: Dict[str, Any], media: List[Dict[str, Any]]
    ) -> PublishResult:
        creds = self._creds()
        if not all(creds.values()):
            return self.not_configured()

        item = media[0]
        url = public_media_url(item)
        if not url.startswith("https://"):
            return PublishResult(
                success=False,
                error_code="MEDIA_URL_INVALID",
                error_message="TikTok mengunduh video dari URL HTTPS terverifikasi (PULL_FROM_URL).",
            )

        direct = self._direct_post_approved()
        endpoint = (
            "/v2/post/publish/video/init/" if direct else "/v2/post/publish/inbox/video/init/"
        )
        body: Dict[str, Any] = {
            "source_info": {"source": "PULL_FROM_URL", "video_url": url}
        }
        if direct:
            body["post_info"] = {
                "title": (publication.get("caption") or "")[:150],
                "privacy_level": os.environ.get("TIKTOK_PRIVACY_LEVEL", "SELF_ONLY"),
            }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    TIKTOK_BASE + endpoint,
                    json=body,
                    headers={
                        "Authorization": f"Bearer {creds['TIKTOK_ACCESS_TOKEN']}",
                        "Content-Type": "application/json",
                    },
                )
                payload = response.json() if response.content else {}
                error = (payload.get("error") or {}) if isinstance(payload, dict) else {}
                if response.is_error or error.get("code", "ok") != "ok":
                    return PublishResult(
                        success=False,
                        error_code=str(error.get("code") or response.status_code),
                        error_message=str(error.get("message") or "TikTok menolak permintaan.")[:500],
                    )
                publish_id = (payload.get("data") or {}).get("publish_id")
                return PublishResult(
                    success=True,
                    external_post_id=publish_id,
                    details={
                        "mode": "DIRECT_POST" if direct else "INBOX_UPLOAD",
                        "note": (
                            "Status akhir bersifat asinkron; TikTok memproses video setelah init."
                            if direct
                            else "Video dikirim ke inbox TikTok, kreator menyelesaikan posting."
                        ),
                    },
                )
        except httpx.HTTPError as exc:
            logger.warning("TikTok publish transport error: %s", type(exc).__name__)
            return PublishResult(
                success=False,
                error_code="TRANSPORT_ERROR",
                error_message="Gagal menghubungi TikTok Content Posting API.",
            )
