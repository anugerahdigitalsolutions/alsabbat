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


IMAGE_SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
}
# Cuplikan berbahaya yang harus dicari di SELURUH awal berkas (polyglot / HTML
# injection): ini benar-benar bisa muncul di offset mana pun.
BLOCKED_SNIPPETS = (b"<script", b"<!doctype html", b"<html", b"<?php")
# Magic byte executable HANYA berarti di offset 0 dan bersifat case-sensitive.
# Sebelumnya keduanya ikut dicek sebagai substring + di-lowercase, sehingga PNG/JPG
# yang sah ditolak begitu data terkompresinya memuat byte "mz"/"MZ"/"mZ" secara
# kebetulan (peluangnya besar dalam 2 KB pertama) — itu false positive-nya.
BLOCKED_MAGICS = (b"MZ", b"\x7fELF")


def sniff_image_mime(content: bytes) -> Optional[str]:
    """Content-based image detection (never trust the client mime/extension)."""
    for signature, mime in IMAGE_SIGNATURES.items():
        if content.startswith(signature):
            return mime
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    if content[4:12] in (b"ftypavif", b"ftypavis"):
        return "image/avif"
    return None


def sanitize_upload(file_name: str, content: bytes, mime_type: str) -> Tuple[str, bytes, str]:
    """Server-side hardening: signature check + safe re-encode for raster images."""
    if content.startswith(BLOCKED_MAGICS):
        raise ValidationFailedError("Berkas ditolak: konten tidak aman untuk media.")
    mime = (mime_type or "").lower()
    sniffed = sniff_image_mime(content)
    if mime.startswith("image/") or sniffed:
        if not sniffed:
            # HTML/SVG/skrip yang menyamar sebagai gambar berhenti di sini.
            raise ValidationFailedError("Berkas gambar tidak valid (signature tidak dikenali).")
        try:
            from io import BytesIO

            from PIL import Image

            with Image.open(BytesIO(content)) as image:
                image.verify()
            with Image.open(BytesIO(content)) as image:
                has_alpha = image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info
                fmt = "PNG" if sniffed in ("image/png", "image/gif") or has_alpha else "JPEG"
                if fmt == "JPEG" and image.mode not in ("RGB", "L"):
                    image = image.convert("RGB")
                buffer = BytesIO()
                image.save(buffer, format=fmt, quality=88, optimize=True)
                content = buffer.getvalue()
                mime = "image/png" if fmt == "PNG" else "image/jpeg"
        except ValidationFailedError:
            raise
        except Exception as exc:
            logger.exception("MEDIA IMAGE PROCESSING FAILED: %s", exc)
            raise ValidationFailedError("Gambar tidak dapat diproses. Gunakan JPG, PNG, atau WEBP.") from exc
        base = os.path.basename(file_name or "gambar")
        stem = base.rsplit(".", 1)[0][:80] or "gambar"
        file_name = f"{stem}.{'png' if mime == 'image/png' else 'jpg'}"
        return file_name, content, mime

    # Non-gambar (PDF/dokumen/video): payload tidak di-re-encode, jadi cuplikan
    # HTML/skrip di awal berkas tetap harus ditolak.
    head = content[:2048].lower()
    if any(snippet.lower() in head for snippet in BLOCKED_SNIPPETS):
        raise ValidationFailedError("Berkas ditolak: konten tidak aman untuk media.")
    return file_name, content, mime


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


class EmergentStorageBackend(StorageBackend):
    """Emergent Managed Object Storage (persistent, deployment-safe).

    Binary lives in object storage; the app streams it back through
    /api/media/files/{key} so no storage credential ever reaches the browser.
    """

    provider = StorageProvider.EMERGENT
    _storage_key: Optional[str] = None

    @property
    def _base_url(self) -> str:
        base = (settings.INTEGRATION_PROXY_URL or "").strip() or "https://integrations.emergentagent.com"
        return base.rstrip("/") + "/objstore/api/v1/storage"

    def is_configured(self) -> bool:
        return bool(settings.EMERGENT_LLM_KEY)

    def _init_key(self, force: bool = False) -> str:
        import requests

        if EmergentStorageBackend._storage_key and not force:
            return EmergentStorageBackend._storage_key
        response = requests.post(
            f"{self._base_url}/init", json={"emergent_key": settings.EMERGENT_LLM_KEY}, timeout=30
        )
        response.raise_for_status()
        EmergentStorageBackend._storage_key = response.json()["storage_key"]
        return EmergentStorageBackend._storage_key

    def _path(self, key: str) -> str:
        prefix = (settings.MEDIA_STORAGE_PREFIX or "alsabbat").strip("/")
        return f"{prefix}/{key.lstrip('/')}"

    async def save(self, key: str, content: bytes, mime_type: str) -> StoredFile:
        import requests

        if not self.is_configured():
            raise ValidationFailedError(
                "Object storage belum dikonfigurasi. Set EMERGENT_LLM_KEY atau ganti MEDIA_STORAGE_PROVIDER."
            )
        path = self._path(key)
        for attempt in (1, 2):
            storage_key = self._init_key(force=attempt == 2)
            response = requests.put(
                f"{self._base_url}/objects/{path}",
                headers={"X-Storage-Key": storage_key, "Content-Type": mime_type},
                data=content,
                timeout=120,
            )
            if response.status_code == 404 and attempt == 1:
                continue
            response.raise_for_status()
            break
        base = settings.MEDIA_CDN_BASE_URL.rstrip("/") if settings.MEDIA_CDN_BASE_URL else ""
        public_path = f"{settings.MEDIA_PUBLIC_PATH}/{key}"
        return StoredFile(
            url=f"{base}{public_path}" if base else public_path,
            storage_key=key,
            provider=self.provider,
            size=len(content),
        )

    def fetch(self, key: str) -> Tuple[bytes, str]:
        import requests

        for attempt in (1, 2):
            storage_key = self._init_key(force=attempt == 2)
            response = requests.get(
                f"{self._base_url}/objects/{self._path(key)}",
                headers={"X-Storage-Key": storage_key},
                timeout=60,
            )
            if response.status_code == 404 and attempt == 1:
                continue
            response.raise_for_status()
            return response.content, response.headers.get("Content-Type", "application/octet-stream")
        raise FileNotFoundError(key)

    async def delete(self, key: str) -> bool:
        # Emergent object storage has no delete API -> metadata soft delete only.
        logger.info("EMERGENT storage has no delete API; keeping binary for key=%s", key)
        return False


class MediaService:
    def __init__(self) -> None:
        provider = settings.MEDIA_STORAGE_PROVIDER
        if provider == StorageProvider.S3.value:
            self.backend: StorageBackend = S3StorageBackend()
        elif provider == StorageProvider.EMERGENT.value:
            self.backend = EmergentStorageBackend()
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
        # Batas ukuran & tipe dievaluasi pada berkas ASLI (sebelum re-encode),
        # agar berkas raksasa tidak lolos hanya karena hasil re-encode-nya kecil.
        validate_file(mime_type, len(content))
        file_name, content, mime_type = sanitize_upload(file_name, content, mime_type)
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
        is_local = self.backend.provider == StorageProvider.LOCAL
        # LOCAL on a self-hosted server (aaPanel + Nginx) is genuinely persistent
        # when MEDIA_LOCAL_DIR points at a directory outside the release folder.
        local_persistent = is_local and settings.MEDIA_LOCAL_PERSISTENT
        if not is_local:
            note = "Penyimpanan objek persisten aktif."
        elif local_persistent:
            note = (
                "Penyimpanan LOCAL pada disk server (self-hosted/aaPanel) aktif dan persisten. "
                f"Direktori: {settings.MEDIA_LOCAL_DIR}. Pastikan direktori ini berada di luar "
                "folder rilis dan ikut dicadangkan secara berkala."
            )
        else:
            note = (
                "Penyimpanan LOCAL bersifat sementara di lingkungan ini — berkas bisa hilang saat "
                "deployment. Untuk server sendiri (aaPanel) set MEDIA_LOCAL_PERSISTENT=true dengan "
                "MEDIA_LOCAL_DIR di luar folder rilis, atau gunakan MEDIA_STORAGE_PROVIDER=S3/EMERGENT."
            )
        return {
            "provider": self.backend.provider.value,
            "configured": self.backend.is_configured(),
            "cdn_enabled": bool(settings.MEDIA_CDN_BASE_URL),
            "persistent": (not is_local) or local_persistent,
            "local_dir": settings.MEDIA_LOCAL_DIR if is_local else None,
            "note": note,
            "limits_mb": {k.value: v for k, v in MAX_SIZE_MB.items()},
            "allowed_mime_types": {k.value: sorted(v) for k, v in ALLOWED_MIME_TYPES.items()},
        }


media_service = MediaService()
