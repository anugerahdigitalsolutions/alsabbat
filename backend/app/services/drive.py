"""Galeri album dari SATU link folder Google Drive (API resmi, tanpa OAuth).

Aturan:
  * hanya folder yang di-share "anyone with the link" + Google API key server-side
  * API key HANYA dibaca dari environment, tidak pernah dikirim ke frontend
  * tidak ada scraping, tidak ada browser automation, tidak ada password Google
  * bila key belum ada / folder tidak bisa diakses => status jelas + pesan admin
    (tidak pernah mengklaim berhasil)
"""
from __future__ import annotations

import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

import httpx

from app.core.config import settings

DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
HTTP_TIMEOUT = 20.0
CACHE_TTL_SECONDS = 300
MAX_FILES = 100

ACCESS_MESSAGE = "Folder Google Drive belum dapat diakses. Pastikan akses folder sesuai konfigurasi."
CONFIG_MESSAGE = (
    "Google Drive API belum dikonfigurasi di server (GOOGLE_DRIVE_API_KEY). "
    + ACCESS_MESSAGE
)
INVALID_MESSAGE = "Link Google Drive tidak dikenali. Gunakan link folder, contoh: https://drive.google.com/drive/folders/XXXX"

_cache: Dict[str, Dict[str, Any]] = {}


def parse_folder_id(raw: Optional[str]) -> Optional[str]:
    """Ambil ID folder dari link share Google Drive biasa."""
    if not raw:
        return None
    value = str(raw).strip()
    if not value:
        return None
    if re.fullmatch(r"[A-Za-z0-9_-]{10,}", value):
        return value
    try:
        url = urlparse(value if value.startswith("http") else f"https://{value}")
    except ValueError:
        return None
    if "drive.google.com" not in (url.netloc or "") and "googleusercontent.com" not in (url.netloc or ""):
        return None
    parts = [p for p in (url.path or "").split("/") if p]
    if "folders" in parts:
        idx = parts.index("folders")
        if idx + 1 < len(parts):
            return parts[idx + 1]
    qs = parse_qs(url.query or "")
    if qs.get("id"):
        return qs["id"][0]
    return None


def _image_urls(file_id: str) -> Dict[str, str]:
    return {
        "thumbnail_url": f"https://drive.google.com/thumbnail?id={file_id}&sz=w800",
        "url": f"https://drive.google.com/thumbnail?id={file_id}&sz=w1920",
    }


async def list_folder_images(folder_url: Optional[str]) -> Dict[str, Any]:
    """Daftar foto di folder Drive, termasuk subfolder tingkat pertama."""
    folder_id = parse_folder_id(folder_url)
    if not folder_id:
        return {"status": "INVALID_LINK", "message": INVALID_MESSAGE, "items": [], "total": 0}

    if not settings.GOOGLE_DRIVE_API_KEY:
        return {
            "status": "NOT_CONFIGURED",
            "message": CONFIG_MESSAGE,
            "items": [],
            "total": 0,
            "folder_id": folder_id,
        }

    cached = _cache.get(folder_id)
    if cached and cached["expires_at"] > time.time():
        return cached["payload"]

    async def drive_get(client, params):
        try:
            return await client.get(DRIVE_FILES_URL, params=params)
        except httpx.HTTPError:
            return None

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        base_params = {
            "key": settings.GOOGLE_DRIVE_API_KEY,
            "fields": "files(id,name,mimeType)",
            "pageSize": MAX_FILES,
            "orderBy": "name_natural",
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
        }

        image_params = {
            **base_params,
            "q": f"'{folder_id}' in parents and mimeType contains 'image/' and trashed = false",
        }

        res = await drive_get(client, image_params)

        if res is None:
            return {
                "status": "ERROR",
                "message": ACCESS_MESSAGE,
                "items": [],
                "total": 0,
                "folder_id": folder_id,
            }

        if res.status_code in (401, 403):
            return {
                "status": "FORBIDDEN",
                "message": ACCESS_MESSAGE,
                "items": [],
                "total": 0,
                "folder_id": folder_id,
            }

        if res.status_code == 404:
            return {
                "status": "NOT_FOUND",
                "message": ACCESS_MESSAGE,
                "items": [],
                "total": 0,
                "folder_id": folder_id,
            }

        if res.status_code >= 400:
            return {
                "status": "ERROR",
                "message": ACCESS_MESSAGE,
                "items": [],
                "total": 0,
                "folder_id": folder_id,
            }

        files = (res.json() or {}).get("files") or []

        # Ambil subfolder tingkat pertama.
        folder_params = {
            **base_params,
            "q": f"'{folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        }

        folder_res = await drive_get(client, folder_params)

        if folder_res is not None and folder_res.status_code == 200:
            subfolders = (folder_res.json() or {}).get("files") or []

            for subfolder in subfolders:
                subfolder_id = subfolder.get("id")
                if not subfolder_id:
                    continue

                sub_params = {
                    **base_params,
                    "q": f"'{subfolder_id}' in parents and mimeType contains 'image/' and trashed = false",
                }

                sub_res = await drive_get(client, sub_params)

                if sub_res is not None and sub_res.status_code == 200:
                    files.extend((sub_res.json() or {}).get("files") or [])

    unique_files = []
    seen_ids = set()

    for item in files:
        file_id = item.get("id")
        if file_id and file_id not in seen_ids:
            seen_ids.add(file_id)
            unique_files.append(item)

    items = [
        {
            "id": item.get("id"),
            "file_name": item.get("name"),
            "alt_text": item.get("name"),
            "file_type": "IMAGE",
            **_image_urls(item.get("id") or ""),
        }
        for item in unique_files
        if item.get("id")
    ]

    payload = {
        "status": "OK" if items else "EMPTY",
        "message": None if items else "Folder Google Drive terbaca, tetapi belum ada foto di dalamnya.",
        "items": items,
        "total": len(items),
        "folder_id": folder_id,
    }

    _cache[folder_id] = {
        "payload": payload,
        "expires_at": time.time() + CACHE_TTL_SECONDS,
    }

    return payload
