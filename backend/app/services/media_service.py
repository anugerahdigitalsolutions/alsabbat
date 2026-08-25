"""Media Service — storage abstraction layer.

Application -> MediaService -> (Image storage | Video storage | CDN)

Actual binary files NEVER live in MongoDB. Only metadata is persisted, while
the file itself is written through a pluggable storage provider:

  * LOCAL  -> local disk (development / self-hosted fallback)
  * S3     -> S3-compatible object storage + optional CDN base URL
  * EXTERNAL -> metadata only, file already hosted elsewhere (CDN/YouTube/etc.)

Swapping providers requires zero changes in the API layer.
"""
from __future__ import annotations

import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

from app.core.config import settings
from app.core.errors import ValidationFailedError
from app.core.logging_config import get_logger
from app.models.enums import MediaType, StorageProvider

logger = get_logger(__name__)

ALLOWED_MIME_TYPES = {
    MediaType.IMAGE: {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
        "image/svg+xml",
    },
    MediaType.VIDEO: {
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-matroska",
    },
    MediaType.DOCUMENT: {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
    },
}

MAX_SIZE_MB = {
    MediaType.IMAGE: settings.MEDIA_MAX_IMAGE_MB,
    MediaType.VIDEO: settings.MEDIA_MAX_VIDEO_MB,
    MediaType.DOCUMENT: settings.MEDIA_MAX_DOCUMENT_MB,
}


@dataclass
class StoredFile:
    url: str
    storage_key: str
    provider: StorageProvider
    size: int


def detect_media_type(mime_type: str) -> MediaType:
    mime = (mime_type or "").lower()
    for media_type, allowed in ALLOWED_MIME_TYPES.items():
        if mime in allowed:
            return media_type
    if mime.startswith("image/"):
        return MediaType.IMAGE
    if mime.startswith("video/"):
        return MediaType.VIDEO
    return MediaType.DOCUMENT


def validate_file(mime_type: str, size_bytes: int) -> MediaType:
    """File type + file size validation (security baseline)."""
    mime = (mime_type or "").lower()
    media_type: Optional[MediaType] = None
    for candidate, allowed in ALLOWED_MIME_TYPES.items():
        if mime in allowed:
            media_type = candidate
            break
    if media_type is None:
        raise ValidationFailedError(f"Unsupported file type '{mime_type}'")
    max_bytes = MAX_SIZE_MB[media_type] * 1024 * 1024
    if size_bytes <= 0:
        raise ValidationFailedError("Uploaded file is empty")
    if size_bytes > max_bytes:
        raise ValidationFailedError(
            f"{media_type.value} exceeds the maximum size of {MAX_SIZE_MB[media_type]}MB"
        )
    return media_type


class StorageBackend(ABC):
    provider: StorageProvider

    @abstractmethod
    async def save(self, key: str, content: bytes, mime_type: str) -> StoredFile: ...

    @abstractmethod
    async def delete(self, key: str) -> bool: ...

    @abstractmethod
    def is_configured(self) -> bool: ...


class LocalStorageBackend(StorageBackend):
    provider = StorageProvider.LOCAL

    def __init__(self, base_dir: str, public_path: str):
        self.base_dir = Path(base_dir)
        self.public_path = public_path.rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def is_configured(self) -> bool:
        return True

    async def save(self, key: str, content: bytes, mime_type: str) -> StoredFile:
        target = self.base_dir / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        base = settings.MEDIA_CDN_BASE_URL.rstrip("/") if settings.MEDIA_CDN_BASE_URL else ""
        url = f"{base}{self.public_path}/{key}" if base else f"{self.public_path}/{key}"
        return StoredFile(url=url, storage_key=key, provider=self.provider, size=len(content))

    async def delete(self, key: str) -> bool:
        target = self.base_dir / key
        if target.exists():
            target.unlink()
            return True
        return False


class S3StorageBackend(StorageBackend):
    provider = StorageProvider.S3

    def is_configured(self) -> bool:
        return bool(
            settings.S3_BUCKET_NAME
            and settings.S3_ACCESS_KEY_ID
            and settings.S3_SECRET_ACCESS_KEY
        )

    def _client(self):
        import boto3  # imported lazily so Phase 1 never requires credentials

        return boto3.client(
            "s3",
            region_name=settings.S3_REGION or None,
            endpoint_url=settings.S3_ENDPOINT_URL or None,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        )

    async def save(self, key: str, content: bytes, mime_type: str) -> StoredFile:
        if not self.is_configured():
            raise ValidationFailedError(
                "Object storage is not configured. Set S3_* environment variables."
            )
        self._client().put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=content,
            ContentType=mime_type,
        )
        if settings.MEDIA_CDN_BASE_URL:
            url = f"{settings.MEDIA_CDN_BASE_URL.rstrip('/')}/{key}"
        elif settings.S3_ENDPOINT_URL:
            url = f"{settings.S3_ENDPOINT_URL.rstrip('/')}/{settings.S3_BUCKET_NAME}/{key}"
        else:
            url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com/{key}"
        return StoredFile(url=url, storage_key=key, provider=self.provider, size=len(content))

    async def delete(self, key: str) -> bool:
        if not self.is_configured():
            return False
        self._client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        return True


class MediaService:
    def __init__(self) -> None:
        provider = settings.MEDIA_STORAGE_PROVIDER
        if provider == StorageProvider.S3.value:
            self.backend: StorageBackend = S3StorageBackend()
        else:
            self.backend = LocalStorageBackend(
                settings.MEDIA_LOCAL_DIR, settings.MEDIA_PUBLIC_PATH
            )
        logger.info("MediaService initialised with provider=%s", self.backend.provider.value)

    @property
    def provider(self) -> StorageProvider:
        return self.backend.provider

    def build_key(self, file_name: str, media_type: MediaType) -> str:
        safe = os.path.basename(file_name or "file").replace(" ", "-")
        safe = "".join(ch for ch in safe if ch.isalnum() or ch in "-._")[-120:] or "file"
        stamp = datetime.now(timezone.utc).strftime("%Y/%m")
        return f"{media_type.value.lower()}/{stamp}/{uuid.uuid4().hex[:12]}-{safe}"

    async def store(
        self, file_name: str, content: bytes, mime_type: str
    ) -> Tuple[StoredFile, MediaType]:
        media_type = validate_file(mime_type, len(content))
        key = self.build_key(file_name, media_type)
        stored = await self.backend.save(key, content, mime_type)
        return stored, media_type

    async def remove(self, key: Optional[str]) -> bool:
        if not key:
            return False
        try:
            return await self.backend.delete(key)
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to delete media key %s: %s", key, exc)
            return False

    def status(self) -> dict:
        return {
            "provider": self.backend.provider.value,
            "configured": self.backend.is_configured(),
            "cdn_enabled": bool(settings.MEDIA_CDN_BASE_URL),
            "limits_mb": {k.value: v for k, v in MAX_SIZE_MB.items()},
            "allowed_mime_types": {k.value: sorted(v) for k, v in ALLOWED_MIME_TYPES.items()},
        }


media_service = MediaService()
