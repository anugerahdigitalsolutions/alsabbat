"""Instagram publisher — official Instagram Graph API content publishing.

Flow (official): POST /{ig_user_id}/media (container, media fetched from a public
HTTPS URL) -> poll GET /{container_id}?fields=status_code -> POST /media_publish.
No scraping, no browser automation, no unofficial endpoints.
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List

import httpx

from app.core.logging_config import get_logger
from app.models.social import SocialConnectionStatus, SocialPlatform
from app.services.social.base import PlatformConfig, PublishResult, SocialPublisher
from app.services.social.validation import public_media_url, validate_instagram

logger = get_logger(__name__)

API_VERSION = os.environ.get("META_API_VERSION", "v21.0")
GRAPH_HOST = os.environ.get("META_GRAPH_HOST", "graph.instagram.com")
ENV_KEYS = ("IG_USER_ID", "IG_ACCESS_TOKEN")


class InstagramPublisher(SocialPublisher):
    platform = SocialPlatform.INSTAGRAM.value
    label = "Instagram"
    official_api = f"Instagram Graph API ({GRAPH_HOST}/{API_VERSION})"

    # ------------------------------------------------------------- config
    def _creds(self) -> Dict[str, str]:
        return {key: os.environ.get(key, "") for key in ENV_KEYS}

    def config(self) -> PlatformConfig:
        creds = self._creds()
        missing = [key for key, value in creds.items() if not value]
        return PlatformConfig(
            platform=self.platform,
            label=self.label,
            connected=not missing,
            status=(
                SocialConnectionStatus.CONNECTED.value
                if not missing
                else SocialConnectionStatus.NOT_CONFIGURED.value
            ),
            requirements=[
                "Akun Instagram Professional (Business/Creator)",
                "Meta App (Business type) dengan produk Instagram",
                "Scope: instagram_business_basic, instagram_business_content_publish",
                "Long-lived access token (berlaku 60 hari, wajib di-refresh)",
                "Media harus dapat diunduh Meta dari URL publik HTTPS",
            ],
            missing_env=missing,
            limitations=[
                "Upload multipart langsung tidak didukung — Meta mengunduh media dari URL",
                "Gambar JPEG maksimal 8 MB; Reels maksimal 300 MB / 15 menit",
                "Kuota publish terbatas per 24 jam (rolling)",
            ],
            official_api=self.official_api,
        )

    # --------------------------------------------------------- validation
    def validate(self, publication: Dict[str, Any], media: List[Dict[str, Any]]) -> None:
        validate_instagram(media)

    # ------------------------------------------------------------ publish
    async def publish(
        self, publication: Dict[str, Any], media: List[Dict[str, Any]]
    ) -> PublishResult:
        creds = self._creds()
        if not all(creds.values()):
            return self.not_configured()

        item = media[0]
        url = public_media_url(item)
        is_image = item.get("file_type") == "IMAGE"
        params: Dict[str, Any] = {
            "caption": publication.get("caption") or "",
            "access_token": creds["IG_ACCESS_TOKEN"],
        }
        if is_image:
            params["image_url"] = url
        else:
            params["media_type"] = "REELS"
            params["video_url"] = url

        base = f"https://{GRAPH_HOST}/{API_VERSION}"
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                created = await client.post(f"{base}/{creds['IG_USER_ID']}/media", params=params)
                if created.is_error:
                    return self._error(created)
                container_id = created.json().get("id")
                if not container_id:
                    return PublishResult(
                        success=False,
                        error_code="NO_CONTAINER",
                        error_message="Instagram tidak mengembalikan container ID.",
                    )

                if not is_image:
                    for _ in range(10):
                        await asyncio.sleep(6)
                        status = await client.get(
                            f"{base}/{container_id}",
                            params={
                                "fields": "status_code",
                                "access_token": creds["IG_ACCESS_TOKEN"],
                            },
                        )
                        code = status.json().get("status_code") if not status.is_error else None
                        if code == "FINISHED":
                            break
                        if code in {"ERROR", "EXPIRED"}:
                            return PublishResult(
                                success=False,
                                error_code=f"CONTAINER_{code}",
                                error_message="Instagram gagal memproses video.",
                                details={"container_id": container_id},
                            )
                    else:
                        return PublishResult(
                            success=False,
                            error_code="CONTAINER_PROCESSING",
                            error_message=(
                                "Video masih diproses Instagram. Gunakan Retry beberapa saat lagi "
                                "(container tersimpan agar tidak terjadi duplikasi)."
                            ),
                            details={"container_id": container_id},
                        )

                published = await client.post(
                    f"{base}/{creds['IG_USER_ID']}/media_publish",
                    params={
                        "creation_id": container_id,
                        "access_token": creds["IG_ACCESS_TOKEN"],
                    },
                )
                if published.is_error:
                    return self._error(published)
                media_id = published.json().get("id")
                return PublishResult(
                    success=True,
                    external_post_id=media_id,
                    external_url=f"https://www.instagram.com/p/{media_id}" if media_id else None,
                    details={"container_id": container_id},
                )
        except httpx.HTTPError as exc:
            logger.warning("Instagram publish transport error: %s", type(exc).__name__)
            return PublishResult(
                success=False,
                error_code="TRANSPORT_ERROR",
                error_message="Gagal menghubungi Instagram Graph API.",
            )

    @staticmethod
    def _error(response: httpx.Response) -> PublishResult:
        try:
            error = response.json().get("error", {})
        except ValueError:
            error = {}
        return PublishResult(
            success=False,
            error_code=str(error.get("code") or response.status_code),
            error_message=str(error.get("message") or "Instagram Graph API menolak permintaan.")[:500],
        )
