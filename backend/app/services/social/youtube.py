"""YouTube publisher — official YouTube Data API v3 resumable upload.

Shorts uses the SAME official upload endpoint; classification is driven by the
video itself (vertical/square and <= 3 minutes), validated before upload.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.social import SocialConnectionStatus, SocialPlatform
from app.services.social.base import PlatformConfig, PublishResult, SocialPublisher
from app.services.social.validation import public_media_url, validate_youtube

logger = get_logger(__name__)

TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
ENV_KEYS = ("YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN")


class YouTubePublisher(SocialPublisher):
    platform = SocialPlatform.YOUTUBE.value
    label = "YouTube"
    official_api = "YouTube Data API v3 (videos.insert, resumable upload)"
    shorts = False

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
                "Google Cloud project dengan YouTube Data API v3 aktif",
                "OAuth client (Web) + refresh token channel ALSABBAT",
                "Scope: https://www.googleapis.com/auth/youtube.upload",
            ],
            missing_env=missing,
            limitations=[
                "Kuota upload default sekitar 100 video per hari per project",
                "Project yang belum lolos audit Google hanya bisa upload privat",
                "Shorts memakai endpoint upload yang sama (vertikal/persegi & <= 3 menit)",
            ],
            official_api=self.official_api,
        )

    def validate(self, publication: Dict[str, Any], media: List[Dict[str, Any]]) -> None:
        validate_youtube(media, shorts=self.shorts)

    # ------------------------------------------------------------ helpers
    async def _access_token(self, client: httpx.AsyncClient, creds: Dict[str, str]) -> Optional[str]:
        response = await client.post(
            TOKEN_URL,
            data={
                "client_id": creds["YOUTUBE_CLIENT_ID"],
                "client_secret": creds["YOUTUBE_CLIENT_SECRET"],
                "refresh_token": creds["YOUTUBE_REFRESH_TOKEN"],
                "grant_type": "refresh_token",
            },
        )
        if response.is_error:
            return None
        return response.json().get("access_token")

    @staticmethod
    def _local_path(item: Dict[str, Any]) -> Optional[Path]:
        key = item.get("storage_key")
        if not key or item.get("storage_provider") != "LOCAL":
            return None
        path = Path(settings.MEDIA_LOCAL_DIR) / key
        return path if path.is_file() else None

    async def publish(
        self, publication: Dict[str, Any], media: List[Dict[str, Any]]
    ) -> PublishResult:
        creds = self._creds()
        if not all(creds.values()):
            return self.not_configured()

        item = media[0]
        path = self._local_path(item)
        remote_url = public_media_url(item)
        if path is None and not remote_url.startswith("https://"):
            return PublishResult(
                success=False,
                error_code="MEDIA_UNAVAILABLE",
                error_message="File video tidak dapat diakses backend untuk diunggah ke YouTube.",
            )

        title = publication.get("title") or (publication.get("caption") or "ALSABBAT")[:100]
        description = publication.get("description") or publication.get("caption") or ""
        tags = list(publication.get("tags") or [])
        if self.shorts and "Shorts" not in tags:
            tags.append("Shorts")

        body = {
            "snippet": {
                "title": title[:100],
                "description": description[:5000],
                "tags": tags[:30],
                "categoryId": os.environ.get("YOUTUBE_CATEGORY_ID", "17"),
            },
            "status": {"privacyStatus": publication.get("visibility") or "private"},
        }

        try:
            async with httpx.AsyncClient(timeout=None) as client:
                token = await self._access_token(client, creds)
                if not token:
                    return PublishResult(
                        success=False,
                        error_code="TOKEN_REFRESH_FAILED",
                        error_message="Refresh token YouTube tidak valid. Hubungkan ulang channel.",
                    )

                if path is not None:
                    payload = path.read_bytes()
                else:
                    downloaded = await client.get(remote_url)
                    if downloaded.is_error:
                        return PublishResult(
                            success=False,
                            error_code="MEDIA_FETCH_FAILED",
                            error_message="Gagal membaca file video dari penyimpanan media.",
                        )
                    payload = downloaded.content

                init = await client.post(
                    UPLOAD_URL,
                    params={"uploadType": "resumable", "part": "snippet,status"},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "X-Upload-Content-Type": item.get("mime_type") or "video/mp4",
                        "X-Upload-Content-Length": str(len(payload)),
                    },
                    json=body,
                )
                if init.is_error:
                    return self._error(init)
                session_url = init.headers.get("location")
                if not session_url:
                    return PublishResult(
                        success=False,
                        error_code="NO_UPLOAD_SESSION",
                        error_message="YouTube tidak mengembalikan sesi upload.",
                    )

                uploaded = await client.put(
                    session_url,
                    content=payload,
                    headers={
                        "Content-Type": item.get("mime_type") or "video/mp4",
                        "Content-Length": str(len(payload)),
                    },
                )
                if uploaded.is_error:
                    return self._error(uploaded)
                video_id = (uploaded.json() or {}).get("id")
                return PublishResult(
                    success=True,
                    external_post_id=video_id,
                    external_url=f"https://www.youtube.com/watch?v={video_id}" if video_id else None,
                    details={"shorts": self.shorts},
                )
        except httpx.HTTPError as exc:
            logger.warning("YouTube publish transport error: %s", type(exc).__name__)
            return PublishResult(
                success=False,
                error_code="TRANSPORT_ERROR",
                error_message="Gagal menghubungi YouTube Data API.",
            )

    @staticmethod
    def _error(response: httpx.Response) -> PublishResult:
        try:
            error = (response.json() or {}).get("error", {})
        except ValueError:
            error = {}
        return PublishResult(
            success=False,
            error_code=str(error.get("code") or response.status_code),
            error_message=str(error.get("message") or "YouTube Data API menolak permintaan.")[:500],
        )


class YouTubeShortsPublisher(YouTubePublisher):
    platform = SocialPlatform.YOUTUBE_SHORTS.value
    label = "YouTube Shorts"
    shorts = True

    def config(self) -> PlatformConfig:
        cfg = super().config()
        cfg.platform = self.platform
        cfg.label = self.label
        cfg.requirements = cfg.requirements + [
            "Video vertikal/persegi dengan durasi maksimal 3 menit",
        ]
        cfg.limitations = cfg.limitations + [
            "Tidak ada endpoint khusus Shorts — koneksi YouTube yang sama digunakan",
        ]
        return cfg
