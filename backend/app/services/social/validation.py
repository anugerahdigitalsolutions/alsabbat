"""Media validation against the official platform requirements (pre-flight)."""
from __future__ import annotations

from typing import Any, Dict, List

from app.core.config import settings
from app.core.errors import ValidationFailedError

MB = 1024 * 1024

IMAGE_MIME = {"image/jpeg", "image/png", "image/webp"}
VIDEO_MIME = {"video/mp4", "video/quicktime", "video/webm"}


def public_media_url(item: Dict[str, Any]) -> str:
    """Absolute HTTPS URL required by platforms that fetch media server-to-server."""
    url = item.get("url") or ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    base = (settings.MEDIA_CDN_BASE_URL or settings.PUBLIC_SITE_URL or "").rstrip("/")
    if not base:
        return ""
    return f"{base}{url if url.startswith('/') else '/' + url}"


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationFailedError(message)


def require_single_media(media: List[Dict[str, Any]]) -> Dict[str, Any]:
    _require(len(media) == 1, "Pilih tepat satu media untuk platform ini.")
    return media[0]


def validate_instagram(media: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Instagram Graph API: image <= 8 MB JPEG, video/reel MP4/MOV."""
    item = require_single_media(media)
    mime = (item.get("mime_type") or "").lower()
    size = int(item.get("file_size") or 0)
    url = public_media_url(item)
    _require(
        url.startswith("https://"),
        "Instagram mengunduh media dari URL publik HTTPS. Set PUBLIC_SITE_URL/MEDIA_CDN_BASE_URL "
        "atau gunakan media yang sudah berada di CDN HTTPS.",
    )
    if item.get("file_type") == "IMAGE":
        _require(mime in {"image/jpeg", "image/png"}, "Instagram hanya menerima gambar JPEG (PNG akan dikonversi).")
        _require(size <= 8 * MB, "Ukuran gambar Instagram maksimal 8 MB.")
    else:
        _require(mime in {"video/mp4", "video/quicktime"}, "Video Instagram harus MP4 atau MOV.")
        _require(size <= 300 * MB, "Video/Reels Instagram maksimal 300 MB.")
        duration = float(item.get("duration") or 0)
        if duration:
            _require(3 <= duration <= 900, "Durasi Reels Instagram harus antara 3 detik dan 15 menit.")
    return item


def validate_tiktok(media: List[Dict[str, Any]]) -> Dict[str, Any]:
    """TikTok Content Posting API: MP4/WebM/MOV, <= 4 GB, <= 10 minutes."""
    item = require_single_media(media)
    _require(item.get("file_type") == "VIDEO", "TikTok hanya menerima video.")
    mime = (item.get("mime_type") or "").lower()
    _require(mime in VIDEO_MIME, "Video TikTok harus MP4, MOV, atau WebM.")
    _require(int(item.get("file_size") or 0) <= 4 * 1024 * MB, "Video TikTok maksimal 4 GB.")
    duration = float(item.get("duration") or 0)
    if duration:
        _require(duration <= 600, "Video TikTok maksimal 10 menit (batas API developer).")
    width, height = int(item.get("width") or 0), int(item.get("height") or 0)
    if width and height:
        _require(
            360 <= min(width, height) and max(width, height) <= 4096,
            "Dimensi video TikTok harus antara 360 px dan 4096 px pada setiap sisi.",
        )
    return item


def validate_youtube(media: List[Dict[str, Any]], shorts: bool) -> Dict[str, Any]:
    """YouTube Data API v3 upload. Shorts = vertikal/persegi dan <= 3 menit."""
    item = require_single_media(media)
    _require(item.get("file_type") == "VIDEO", "YouTube hanya menerima video.")
    mime = (item.get("mime_type") or "").lower()
    _require(mime in VIDEO_MIME, "Video YouTube harus MP4, MOV, atau WebM.")
    if shorts:
        duration = float(item.get("duration") or 0)
        width, height = int(item.get("width") or 0), int(item.get("height") or 0)
        _require(
            duration > 0 and width > 0 and height > 0,
            "Metadata video (durasi & dimensi) belum tersedia, sehingga syarat Shorts tidak dapat diverifikasi.",
        )
        _require(duration <= 180, "YouTube Shorts maksimal 3 menit (180 detik).")
        _require(height >= width, "YouTube Shorts harus berorientasi vertikal atau persegi.")
    return item


def validate_website(publication: Dict[str, Any]) -> None:
    _require(
        bool(publication.get("post_id")),
        "Publikasi Website harus terhubung ke berita/post yang sudah ada di CMS.",
    )
