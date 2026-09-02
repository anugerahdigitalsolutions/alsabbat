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

import hashlib
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


def _fingerprint(value: str | None) -> str | None:
    """Sidik jari SHA-256 (8 hex pertama) — TIDAK dapat dibalik ke nilai asli.

    Dipakai agar konfigurasi kredensial bisa dibandingkan/di-diagnosis tanpa
    pernah menampilkan CLOUDINARY_API_SECRET.
    """
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:8]

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
        # Direktori TIDAK dibuat saat import: pada deployment serverless
        # (Vercel) filesystem bersifat read-only sehingga mkdir di sini membuat
        # seluruh aplikasi gagal di-import (OSError: Read-only file system).
        # Direktori dibuat saat penyimpanan pertama (lihat `save`).

    def is_configured(self) -> bool:
        return True

    async def save(self, key: str, content: bytes, mime_type: str) -> StoredFile:
        target = self.base_dir / key
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        except OSError as exc:
            raise ValidationFailedError(
                "Penyimpanan media lokal tidak dapat ditulis pada environment ini "
                "(filesystem read-only). Set MEDIA_STORAGE_PROVIDER=CLOUDINARY beserta "
                "kredensial Cloudinary agar media tersimpan di CDN."
            ) from exc
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


class CloudinaryStorageBackend(StorageBackend):
    """Cloudinary — penyimpanan media utama untuk staging & production.

    - `save()` mengunggah biner ke Cloudinary dan mengembalikan **secure_url**
      (HTTPS) beserta `storage_key` = **public_id** (dipakai untuk delete/replace).
    - `replace()` mengunggah ke public_id yang sama (`overwrite=True`) sehingga
      URL tetap dan cache CDN di-invalidate.
    - Folder/prefix diambil dari `CLOUDINARY_FOLDER` (fallback `MEDIA_STORAGE_PREFIX`)
      agar staging dan production tidak pernah berbagi folder.
    Tidak ada berkas yang ditulis ke disk server.
    """

    provider = StorageProvider.CLOUDINARY
    _configured_sdk = False

    def is_configured(self) -> bool:
        return settings.cloudinary_configured

    def _sdk(self):
        try:
            import cloudinary
            import cloudinary.uploader  # noqa: F401
        except Exception as exc:  # pragma: no cover - dependency missing
            raise ValidationFailedError(
                "Paket 'cloudinary' belum terpasang di server. Jalankan "
                "pip install -r requirements.txt."
            ) from exc
        if not self.is_configured():
            missing = ", ".join(settings.missing_cloudinary_vars()) or "CLOUDINARY_URL"
            raise ValidationFailedError(
                f"Cloudinary belum dikonfigurasi. Variable yang belum diisi: {missing}."
            )
        if not CloudinaryStorageBackend._configured_sdk:
            # Presedensi eksplisit: bila trio CLOUDINARY_CLOUD_NAME/API_KEY/
            # API_SECRET tersedia, ITU yang dipakai. CLOUDINARY_URL hanya
            # fallback, sehingga api_key & api_secret yang dipakai untuk
            # menandatangani upload SELALU berasal dari sumber yang sama
            # (penyebab umum "Invalid Signature" adalah campuran dua sumber).
            algorithm = settings.CLOUDINARY_SIGNATURE_ALGORITHM or "sha1"
            if (
                settings.CLOUDINARY_CLOUD_NAME
                and settings.CLOUDINARY_API_KEY
                and settings.CLOUDINARY_API_SECRET
            ):
                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET,
                    secure=True,
                    signature_algorithm=algorithm,
                )
            else:
                # Dari CLOUDINARY_URL (dibaca SDK dari environment).
                cloudinary.config(secure=True, signature_algorithm=algorithm)
            CloudinaryStorageBackend._configured_sdk = True
        return cloudinary

    def config_diagnostics(self) -> dict:
        """Diagnostik konfigurasi Cloudinary — AMAN (secret tidak pernah tampil).

        Hanya memuat cloud_name, 4 digit terakhir api_key, panjang nilai,
        sidik jari SHA-256 8-hex dari api_secret (tidak dapat dibalik), sumber
        kredensial yang benar-benar dipakai SDK, dan deteksi konflik bila
        CLOUDINARY_URL berisi kredensial berbeda dari trio CLOUDINARY_*.
        """
        cloudinary = self._sdk()
        cfg = cloudinary.config()
        trio_complete = bool(
            settings.CLOUDINARY_CLOUD_NAME
            and settings.CLOUDINARY_API_KEY
            and settings.CLOUDINARY_API_SECRET
        )
        url_present = bool(settings.CLOUDINARY_URL)
        cfg_api_key = str(cfg.api_key or "")
        cfg_secret = str(cfg.api_secret or "")
        diag = {
            "cloud_name": cfg.cloud_name,
            "api_key_last4": cfg_api_key[-4:] or None,
            "api_key_length": len(cfg_api_key),
            "api_secret_fingerprint": _fingerprint(cfg_secret),
            "api_secret_length": len(cfg_secret),
            "signature_algorithm": settings.CLOUDINARY_SIGNATURE_ALGORITHM or "sha1",
            "folder": settings.cloudinary_folder,
            "upload_preset_configured": bool(settings.CLOUDINARY_UPLOAD_PRESET),
            "cloudinary_url_present": url_present,
            "env_trio_complete": trio_complete,
            "credential_source": (
                "CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET"
                if trio_complete
                else ("CLOUDINARY_URL" if url_present else "TIDAK LENGKAP")
            ),
            "sdk_uses_env_trio": bool(
                trio_complete
                and cfg_api_key == settings.CLOUDINARY_API_KEY
                and cfg.cloud_name == settings.CLOUDINARY_CLOUD_NAME
                and _fingerprint(cfg_secret) == _fingerprint(settings.CLOUDINARY_API_SECRET)
            ),
        }
        if url_present:
            # cloudinary://<api_key>:<api_secret>@<cloud_name>
            try:
                remainder = settings.CLOUDINARY_URL.split("://", 1)[1]
                credentials, cloud_part = remainder.split("@", 1)
                url_key, url_secret = credentials.split(":", 1)
                url_cloud = cloud_part.split("/")[0]
                diag["cloudinary_url_conflict"] = {
                    "cloud_name_differs": bool(
                        trio_complete and url_cloud != settings.CLOUDINARY_CLOUD_NAME
                    ),
                    "api_key_differs": bool(
                        trio_complete and url_key != settings.CLOUDINARY_API_KEY
                    ),
                    "api_secret_differs": bool(
                        trio_complete
                        and _fingerprint(url_secret)
                        != _fingerprint(settings.CLOUDINARY_API_SECRET)
                    ),
                }
            except Exception:
                diag["cloudinary_url_conflict"] = {"parse_error": True}
        return diag

    @staticmethod
    def _resource_type(mime_type: str) -> str:
        mime = (mime_type or "").lower()
        if mime.startswith("image/"):
            return "image"
        if mime.startswith("video/") or mime.startswith("audio/"):
            return "video"
        return "raw"

    def public_id(self, key: str) -> str:
        """public_id = <folder>/<key tanpa ekstensi> (ekstensi diurus Cloudinary)."""
        clean = key.lstrip("/")
        stem = clean.rsplit(".", 1)[0] if "." in clean.rsplit("/", 1)[-1] else clean
        return f"{settings.cloudinary_folder}/{stem}"

    async def save(
        self, key: str, content: bytes, mime_type: str, public_id: Optional[str] = None
    ) -> StoredFile:
        import asyncio

        cloudinary = self._sdk()
        from cloudinary import uploader

        target_id = public_id or self.public_id(key)
        resource_type = self._resource_type(mime_type)
        options = {
            "public_id": target_id,
            "resource_type": resource_type,
            "overwrite": True,
            "invalidate": True,
        }
        if settings.CLOUDINARY_UPLOAD_PRESET:
            options["upload_preset"] = settings.CLOUDINARY_UPLOAD_PRESET

        def _upload():
            return uploader.upload(content, **options)

        try:
            result = await asyncio.to_thread(_upload)
        except ValidationFailedError:
            raise
        except Exception as exc:
            logger.error("CLOUDINARY UPLOAD FAILED type=%s", type(exc).__name__)
            raise ValidationFailedError(
                "Gagal mengunggah media ke Cloudinary. Periksa konfigurasi Cloudinary di server."
            ) from exc
        secure_url = result.get("secure_url") or result.get("url") or ""
        stored_id = result.get("public_id") or target_id
        # `storage_key` menyimpan resource_type agar delete/replace tetap akurat
        # untuk video/raw (Cloudinary butuh resource_type saat destroy).
        storage_key = f"{resource_type}:{stored_id}"
        logger.info("cloudinary.upload ok resource=%s", resource_type)
        return StoredFile(
            url=secure_url,
            storage_key=storage_key,
            provider=self.provider,
            size=int(result.get("bytes") or len(content)),
        )

    async def replace(self, storage_key: str, content: bytes, mime_type: str) -> StoredFile:
        """Update media di tempat: public_id sama, URL tetap, cache di-invalidate."""
        resource_type, _, stored_id = (storage_key or "").partition(":")
        if not stored_id:
            stored_id = resource_type or ""
        return await self.save(stored_id, content, mime_type, public_id=stored_id)

    async def delete(self, key: str) -> bool:
        import asyncio

        self._sdk()
        from cloudinary import uploader

        resource_type, _, stored_id = (key or "").partition(":")
        if not stored_id:
            stored_id, resource_type = resource_type, "image"

        def _destroy():
            return uploader.destroy(stored_id, resource_type=resource_type, invalidate=True)

        try:
            result = await asyncio.to_thread(_destroy)
        except Exception as exc:
            logger.warning("cloudinary.delete_failed type=%s", type(exc).__name__)
            return False
        return str(result.get("result", "")).lower() in {"ok", "not found"}


class MediaService:
    def __init__(self) -> None:
        # Normalisasi aman: nilai environment bisa datang sebagai "cloudinary",
        # " Cloudinary " atau dengan tanda kutip.
        provider = (settings.MEDIA_STORAGE_PROVIDER or "").strip().strip("'\"").upper()
        if provider != StorageProvider.CLOUDINARY.value and settings.is_serverless:
            # Serverless (Vercel): filesystem deployment read-only, jadi LOCAL
            # bukan opsi yang valid. Bila kredensial Cloudinary tersedia, media
            # WAJIB memakai Cloudinary; bila tidak, dicatat eksplisit di log.
            if settings.cloudinary_configured:
                logger.warning(
                    "MEDIA_STORAGE_PROVIDER=%s tidak didukung pada runtime serverless; "
                    "memakai CLOUDINARY karena kredensial Cloudinary tersedia.",
                    provider or "(kosong)",
                )
                provider = StorageProvider.CLOUDINARY.value
            elif provider in {"", StorageProvider.LOCAL.value}:
                logger.error(
                    "Runtime serverless tanpa kredensial Cloudinary: media TIDAK dapat "
                    "disimpan. Set MEDIA_STORAGE_PROVIDER=CLOUDINARY dan variable "
                    "CLOUDINARY_* pada environment deployment."
                )
        if provider == StorageProvider.S3.value:
            self.backend: StorageBackend = S3StorageBackend()
        elif provider == StorageProvider.EMERGENT.value:
            self.backend = EmergentStorageBackend()
        elif provider == StorageProvider.CLOUDINARY.value:
            # Validasi konfigurasi: staging/production TIDAK boleh berjalan dengan
            # provider CLOUDINARY tanpa kredensial (fail fast, pesan jelas,
            # nilai kredensial tidak pernah ditampilkan).
            if not settings.cloudinary_configured and (
                settings.is_production or settings.is_staging
            ):
                missing = ", ".join(settings.missing_cloudinary_vars()) or "CLOUDINARY_URL"
                raise RuntimeError(
                    "MEDIA_STORAGE_PROVIDER=CLOUDINARY pada ENVIRONMENT="
                    f"{settings.ENVIRONMENT} tetapi kredensial Cloudinary belum lengkap. "
                    f"Isi variable berikut di environment server: {missing} "
                    "(atau CLOUDINARY_URL). Media TIDAK akan disimpan ke disk server."
                )
            self.backend = CloudinaryStorageBackend()
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

    async def replace(
        self, storage_key: Optional[str], file_name: str, content: bytes, mime_type: str
    ) -> Tuple[StoredFile, MediaType]:
        """Update berkas media di tempat bila backend mendukungnya (Cloudinary).

        Fallback: unggah sebagai berkas baru (perilaku lama tetap aman).
        """
        validate_file(mime_type, len(content))
        file_name, content, mime_type = sanitize_upload(file_name, content, mime_type)
        media_type = validate_file(mime_type, len(content))
        replacer = getattr(self.backend, "replace", None)
        if storage_key and callable(replacer):
            stored = await replacer(storage_key, content, mime_type)
            return stored, media_type
        key = self.build_key(file_name, media_type)
        stored = await self.backend.save(key, content, mime_type)
        return stored, media_type

    async def direct_upload_signature(
        self, file_name: str, mime_type: str, subfolder: Optional[str] = None
    ) -> dict:
        """Data tanda tangan untuk upload LANGSUNG dari browser ke Cloudinary.

        Dipakai agar berkas besar tidak melewati fungsi serverless (batas body
        request Vercel). Browser -> Cloudinary -> (public_id/secure_url) -> API.
        Mengembalikan None-safe dict; memanggilnya pada provider non-Cloudinary
        akan menghasilkan ValidationFailedError sehingga frontend bisa fallback.
        """
        if self.backend.provider != StorageProvider.CLOUDINARY:
            raise ValidationFailedError(
                "Direct upload hanya tersedia bila MEDIA_STORAGE_PROVIDER=CLOUDINARY."
            )
        if not settings.cloudinary_configured:
            missing = ", ".join(settings.missing_cloudinary_vars()) or "CLOUDINARY_URL"
            raise ValidationFailedError(
                f"Cloudinary belum dikonfigurasi. Variable yang belum diisi: {missing}."
            )
        import time

        import cloudinary
        from cloudinary.utils import api_sign_request

        # Pastikan SDK terkonfigurasi (memakai jalur yang sama dengan upload biasa).
        self.backend._sdk()  # noqa: SLF001 - internal helper milik backend yang sama
        media_type = detect_media_type(mime_type)
        if media_type not in MAX_SIZE_MB:
            raise ValidationFailedError("Tipe berkas ini tidak diizinkan.")
        key = self.build_key(file_name, media_type)
        base_public_id = self.backend.public_id(key)
        if subfolder:
            folder = settings.cloudinary_folder
            base_public_id = base_public_id.replace(
                f"{folder}/", f"{folder}/{subfolder.strip('/')}/", 1
            )
        resource_type = CloudinaryStorageBackend._resource_type(mime_type)
        timestamp = int(time.time())
        # PENTING: parameter yang ditandatangani harus PERSIS sama dengan yang
        # dikirim browser ke Cloudinary (selain file, api_key, dan signature).
        # api_sign_request mengurutkan & meng-canonicalize sendiri sesuai aturan
        # Cloudinary (k=v digabung '&', urut abjad) — tidak ada signature manual.
        params = {"public_id": base_public_id, "timestamp": timestamp}
        if settings.CLOUDINARY_UPLOAD_PRESET:
            params["upload_preset"] = settings.CLOUDINARY_UPLOAD_PRESET
        api_secret = cloudinary.config().api_secret
        if not api_secret:
            raise ValidationFailedError(
                "CLOUDINARY_API_SECRET tidak terbaca di server. Periksa variable "
                "Cloudinary di environment deployment."
            )
        algorithm = settings.CLOUDINARY_SIGNATURE_ALGORITHM or "sha1"
        signature = api_sign_request(params, api_secret, algorithm=algorithm)
        # Diagnostik AMAN (tanpa secret) — juga dicatat di log server agar
        # kegagalan "Invalid Signature" bisa ditelusuri dari sisi backend.
        from cloudinary.utils import api_string_to_sign

        string_to_sign = api_string_to_sign(params)
        diagnostics = self.backend.config_diagnostics()
        diagnostics.update(
            {
                "public_id": base_public_id,
                "timestamp": timestamp,
                "signed_params": sorted(params.keys()),
                "params_sent_to_cloudinary": sorted(
                    ["file", "api_key", "signature", *params.keys()]
                ),
                "string_to_sign": string_to_sign,
            }
        )
        logger.info(
            "cloudinary.sign cloud=%s api_key_last4=%s source=%s algorithm=%s "
            "secret_fp=%s string_to_sign=%s",
            diagnostics.get("cloud_name"),
            diagnostics.get("api_key_last4"),
            diagnostics.get("credential_source"),
            algorithm,
            diagnostics.get("api_secret_fingerprint"),
            string_to_sign,
        )
        conflict = diagnostics.get("cloudinary_url_conflict") or {}
        if any(conflict.values()):
            logger.warning(
                "cloudinary.sign.credential_conflict CLOUDINARY_URL berbeda dari trio "
                "CLOUDINARY_* (%s) — hapus salah satu agar tidak tercampur.",
                conflict,
            )
        return {
            "provider": StorageProvider.CLOUDINARY.value,
            "cloud_name": cloudinary.config().cloud_name,
            "api_key": cloudinary.config().api_key,
            "upload_url": (
                f"https://api.cloudinary.com/v1_1/{cloudinary.config().cloud_name}/"
                f"{resource_type}/upload"
            ),
            "resource_type": resource_type,
            "public_id": base_public_id,
            "timestamp": timestamp,
            "signature": signature,
            "upload_preset": settings.CLOUDINARY_UPLOAD_PRESET or None,
            "storage_key": f"{resource_type}:{base_public_id}",
            "max_bytes": MAX_SIZE_MB.get(media_type, 10) * 1024 * 1024,
            "media_type": media_type.value,
            "diagnostics": diagnostics,
        }

    def cloudinary_diagnostics(self) -> dict:
        """Diagnostik konfigurasi Cloudinary (aman) untuk endpoint admin."""
        if self.backend.provider != StorageProvider.CLOUDINARY:
            return {
                "provider": self.backend.provider.value,
                "message": "Provider aktif bukan CLOUDINARY, diagnostik tidak berlaku.",
            }
        return {"provider": StorageProvider.CLOUDINARY.value, **self.backend.config_diagnostics()}

    async def direct_upload_self_test(self) -> dict:
        """Uji signature direct-upload terhadap Cloudinary yang sebenarnya.

        Memakai JALUR TANDA TANGAN YANG SAMA dengan browser (params identik:
        public_id + timestamp [+ upload_preset]) lalu mengunggah 1 berkas PNG
        1x1 dari server ke endpoint upload Cloudinary. Berkas uji langsung
        dihapus kembali. Tidak pernah menampilkan/mencatat CLOUDINARY_API_SECRET
        (hanya 4 digit terakhir api_key sebagai penanda).
        """
        import asyncio
        import base64

        import requests
        from cloudinary.utils import api_sign_request, api_string_to_sign

        signed = await self.direct_upload_signature(
            "signature-self-test.png", "image/png", subfolder="_selftest"
        )
        cloudinary = self.backend._sdk()  # noqa: SLF001 - pastikan SDK terkonfigurasi
        api_secret = str(cloudinary.config().api_secret or "")
        # Parameter yang ditandatangani = parameter yang dikirim (selain file,
        # api_key, signature) — identik dengan yang dikirim browser.
        params: dict = {"public_id": signed["public_id"], "timestamp": signed["timestamp"]}
        if signed.get("upload_preset"):
            params["upload_preset"] = signed["upload_preset"]
        configured_algorithm = settings.CLOUDINARY_SIGNATURE_ALGORITHM or "sha1"
        diagnostics = self.backend.config_diagnostics()
        diagnostics.update(
            {
                "public_id": signed["public_id"],
                "timestamp": signed["timestamp"],
                "signed_params": sorted(params.keys()),
                "params_sent_to_cloudinary": sorted(
                    ["file", "api_key", "signature", *params.keys()]
                ),
                "string_to_sign": api_string_to_sign(params),
                "upload_url": signed["upload_url"],
            }
        )
        png_1x1 = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF/9YvJAAAAAElFTkSuQmCC"
        )

        def _error_message(resp: requests.Response) -> str:
            try:
                return str(resp.json().get("error", {}).get("message", ""))[:300]
            except Exception:
                return resp.text[:300]

        def _upload(signature: str) -> requests.Response:
            data = {"api_key": signed["api_key"], "signature": signature}
            data.update({key: str(value) for key, value in params.items()})
            return requests.post(
                signed["upload_url"],
                data=data,
                files={"file": ("self-test.png", png_1x1, "image/png")},
                timeout=30,
            )

        # Probe: algoritma yang dikonfigurasi lebih dulu, lalu alternatifnya —
        # sehingga penyebab (secret salah vs algoritma akun SHA-256) terpisah jelas.
        candidates = [configured_algorithm] + [
            algo for algo in ("sha1", "sha256") if algo != configured_algorithm
        ]
        attempts: list = []
        response = None
        used_algorithm = None
        for algorithm in candidates:
            signature = api_sign_request(params, api_secret, algorithm=algorithm)
            try:
                candidate = await asyncio.to_thread(_upload, signature)
            except Exception as exc:  # pragma: no cover - jaringan
                logger.warning("cloudinary.self_test.network_error type=%s", type(exc).__name__)
                return {
                    "success": False,
                    "stage": "network",
                    "message": "Tidak dapat menghubungi Cloudinary dari server.",
                    "attempts": attempts,
                    "diagnostics": diagnostics,
                }
            attempts.append(
                {
                    "algorithm": algorithm,
                    "http_status": candidate.status_code,
                    "cloudinary_error": (
                        _error_message(candidate) if candidate.status_code >= 400 else None
                    ),
                }
            )
            if candidate.status_code < 400:
                response = candidate
                used_algorithm = algorithm
                break

        if response is None:
            invalid_signature_only = all(
                "invalid signature" in (attempt.get("cloudinary_error") or "").lower()
                for attempt in attempts
            )
            if invalid_signature_only:
                message = (
                    "Parameter & canonicalization signature sudah benar (lihat "
                    "string_to_sign) dan kedua algoritma (SHA-1 & SHA-256) ditolak. "
                    "Cloudinary mengembalikan 'Invalid Signature' pada dua kondisi: "
                    "(a) CLOUDINARY_API_SECRET bukan pasangan dari CLOUDINARY_API_KEY, "
                    "atau (b) CLOUDINARY_API_KEY tidak terdaftar pada cloud "
                    f"'{diagnostics.get('cloud_name')}' (mis. key/secret berasal dari "
                    "product environment Cloudinary yang berbeda). Ambil ulang Cloud name "
                    "+ API key + API secret dari SATU product environment yang sama, "
                    "bandingkan api_secret_fingerprint di bawah dengan sidik jari nilai "
                    "dashboard Anda, lalu redeploy."
                )
                if any((diagnostics.get("cloudinary_url_conflict") or {}).values()):
                    message += (
                        " PERHATIAN: CLOUDINARY_URL di environment berisi kredensial "
                        "BERBEDA dari trio CLOUDINARY_* — hapus salah satunya."
                    )
            else:
                message = (
                    "Cloudinary menolak upload uji. Periksa pesan pada attempts untuk "
                    "penyebab pasti (mis. preset tidak dikenal, cloud_name salah, atau "
                    "resource terbatas)."
                )
            logger.warning(
                "cloudinary.self_test.rejected attempts=%s (secret tidak pernah dicatat)",
                [(a["algorithm"], a["http_status"]) for a in attempts],
            )
            return {
                "success": False,
                "stage": "cloudinary",
                "http_status": attempts[-1]["http_status"] if attempts else None,
                "cloudinary_error": attempts[-1]["cloudinary_error"] if attempts else None,
                "message": message,
                "attempts": attempts,
                "diagnostics": diagnostics,
            }

        body = response.json()
        public_id = body.get("public_id")
        algorithm_mismatch = used_algorithm != configured_algorithm
        result = {
            "success": True,
            "http_status": response.status_code,
            "public_id": public_id,
            "secure_url": body.get("secure_url"),
            "resource_type": body.get("resource_type"),
            "bytes": body.get("bytes"),
            "signature_algorithm_accepted": used_algorithm,
            "algorithm_mismatch_detected": algorithm_mismatch,
            "message": (
                (
                    f"Signature valid dengan algoritma {used_algorithm}, tetapi server "
                    f"dikonfigurasi {configured_algorithm}. Set "
                    f"CLOUDINARY_SIGNATURE_ALGORITHM={used_algorithm} di environment "
                    "deployment lalu redeploy."
                )
                if algorithm_mismatch
                else "Signature valid — upload langsung ke Cloudinary berhasil."
            ),
            "attempts": attempts,
            "diagnostics": diagnostics,
        }
        # Bersihkan berkas uji (best-effort, tidak mengubah hasil verifikasi).
        try:
            from cloudinary import uploader

            await asyncio.to_thread(
                uploader.destroy, public_id, resource_type=body.get("resource_type", "image"),
                invalidate=True,
            )
            result["cleanup"] = "deleted"
        except Exception:  # pragma: no cover
            result["cleanup"] = "manual"
        logger.info("cloudinary.self_test.ok public_id=%s", public_id)
        return result


    def status(self) -> dict:
        is_local = self.backend.provider == StorageProvider.LOCAL
        is_cloudinary = self.backend.provider == StorageProvider.CLOUDINARY
        # LOCAL on a self-hosted server (aaPanel + Nginx) is genuinely persistent
        # when MEDIA_LOCAL_DIR points at a directory outside the release folder.
        local_persistent = is_local and settings.MEDIA_LOCAL_PERSISTENT
        if is_cloudinary:
            configured = self.backend.is_configured()
            if configured:
                note = (
                    "Cloudinary aktif sebagai penyimpanan media utama (HTTPS/CDN, persisten). "
                    f"Folder: {settings.cloudinary_folder}. Tidak ada berkas media yang "
                    "ditulis ke disk server."
                )
            else:
                missing = ", ".join(settings.missing_cloudinary_vars()) or "CLOUDINARY_URL"
                note = (
                    "Cloudinary dipilih tetapi kredensial belum lengkap. Isi variable berikut "
                    f"di environment server: {missing}. Upload media akan ditolak sampai diisi."
                )
            return {
                "provider": self.backend.provider.value,
                "configured": configured,
                "cdn_enabled": True,
                "persistent": configured,
                "local_dir": None,
                "cloudinary_folder": settings.cloudinary_folder,
                "upload_preset_used": bool(settings.CLOUDINARY_UPLOAD_PRESET),
                "note": note,
                "limits_mb": {k.value: v for k, v in MAX_SIZE_MB.items()},
                "allowed_mime_types": {k.value: sorted(v) for k, v in ALLOWED_MIME_TYPES.items()},
            }
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
