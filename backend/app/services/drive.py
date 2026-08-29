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


# ------------------------------------------------------------------ browse
# Navigasi folder → subfolder → foto memakai API resmi yang SAMA
# (Drive v3 files.list + files.get, API key server-side, tanpa OAuth).
BROWSE_PAGE_SIZE = 50          # 10 baris × maks 5 kolom thumbnail
MAX_BROWSE_PAGE_SIZE = 100
ANCESTOR_MAX_DEPTH = 12
FOLDER_MIME = "application/vnd.google-apps.folder"
SCOPE_MESSAGE = "Folder ini berada di luar album Google Drive yang dipublikasikan."

_browse_cache: Dict[str, Dict[str, Any]] = {}
_meta_cache: Dict[str, Dict[str, Any]] = {}


def _browse_error(status: str, root_id: Optional[str], message: Optional[str] = None) -> Dict[str, Any]:
    return {
        "status": status,
        "message": message or ACCESS_MESSAGE,
        "root_folder_id": root_id,
        "folder": None,
        "path": [],
        "folders": [],
        "files": [],
        "next_page_token": None,
        "is_file": False,
    }


def _cached(store: Dict[str, Dict[str, Any]], key: str):
    entry = store.get(key)
    if entry and entry["expires_at"] > time.time():
        return entry["payload"]
    return None


def _store(store: Dict[str, Dict[str, Any]], key: str, payload: Any) -> Any:
    store[key] = {"payload": payload, "expires_at": time.time() + CACHE_TTL_SECONDS}
    return payload


async def _get_meta(client, file_id: str) -> Optional[Dict[str, Any]]:
    """Metadata satu file/folder Drive (nama, mime, parent) — di-cache."""
    hit = _cached(_meta_cache, file_id)
    if hit is not None:
        return hit
    try:
        res = await client.get(
            f"{DRIVE_FILES_URL}/{file_id}",
            params={
                "key": settings.GOOGLE_DRIVE_API_KEY,
                "fields": "id,name,mimeType,parents",
                "supportsAllDrives": "true",
            },
        )
    except httpx.HTTPError:
        return None
    if res.status_code != 200:
        return None
    return _store(_meta_cache, file_id, res.json() or {})


async def _ancestor_path(client, folder_id: str, root_id: str) -> Optional[List[Dict[str, str]]]:
    """Breadcrumb root → … → folder. None bila folder bukan turunan root."""
    if folder_id == root_id:
        return []
    trail: List[Dict[str, str]] = []
    current = folder_id
    for _ in range(ANCESTOR_MAX_DEPTH):
        meta = await _get_meta(client, current)
        if not meta:
            return None
        trail.append({"id": meta.get("id") or current, "name": meta.get("name") or "Folder"})
        parents = meta.get("parents") or []
        if not parents:
            return None
        parent = parents[0]
        if parent == root_id:
            trail.reverse()
            return trail
        current = parent
    return None


async def browse_folder(
    folder_url: Optional[str],
    folder_id: Optional[str] = None,
    page_token: Optional[str] = None,
    page_size: int = BROWSE_PAGE_SIZE,
) -> Dict[str, Any]:
    """Isi satu folder Drive: subfolder + foto, dengan pageToken resmi Drive.

    * `folder_url` = link album (root). `folder_id` = folder yang sedang dibuka;
      wajib merupakan turunan root (dicek lewat `parents`) supaya API key server
      tidak bisa dipakai menelusuri folder lain.
    * Bila link album menunjuk ke satu FILE gambar, foto itu langsung dikembalikan.
    * Tidak pernah memuat seluruh isi folder: satu request = satu halaman.
    """
    root_id = parse_folder_id(folder_url)
    if not root_id:
        return _browse_error("INVALID_LINK", None, INVALID_MESSAGE)
    if not settings.GOOGLE_DRIVE_API_KEY:
        return _browse_error("NOT_CONFIGURED", root_id, CONFIG_MESSAGE)

    size = max(1, min(int(page_size or BROWSE_PAGE_SIZE), MAX_BROWSE_PAGE_SIZE))
    target_id = (folder_id or root_id).strip()
    cache_key = f"{root_id}|{target_id}|{page_token or ''}|{size}"
    hit = _cached(_browse_cache, cache_key)
    if hit is not None:
        return hit

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        root_meta = await _get_meta(client, root_id)
        if not root_meta:
            return _browse_error("NOT_FOUND", root_id)

        root_name = root_meta.get("name") or "Album"
        root_is_folder = root_meta.get("mimeType") == FOLDER_MIME

        # Link album menunjuk langsung ke satu foto.
        if not root_is_folder:
            if not str(root_meta.get("mimeType") or "").startswith("image/"):
                return _browse_error("INVALID_LINK", root_id, INVALID_MESSAGE)
            payload = {
                "status": "OK",
                "message": None,
                "root_folder_id": root_id,
                "folder": {"id": root_id, "name": root_name},
                "path": [],
                "folders": [],
                "files": [_image_item(root_meta)],
                "next_page_token": None,
                "is_file": True,
            }
            return _store(_browse_cache, cache_key, payload)

        path: List[Dict[str, str]] = []
        folder_name = root_name
        if target_id != root_id:
            trail = await _ancestor_path(client, target_id, root_id)
            if trail is None:
                return _browse_error("FORBIDDEN_SCOPE", root_id, SCOPE_MESSAGE)
            path = trail
            folder_name = trail[-1]["name"] if trail else root_name

        params = {
            "key": settings.GOOGLE_DRIVE_API_KEY,
            "q": (
                f"'{target_id}' in parents and trashed = false and "
                f"(mimeType = '{FOLDER_MIME}' or mimeType contains 'image/')"
            ),
            "fields": "nextPageToken,files(id,name,mimeType)",
            "pageSize": size,
            "orderBy": "folder,name_natural",
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
        }
        if page_token:
            params["pageToken"] = page_token

        try:
            res = await client.get(DRIVE_FILES_URL, params=params)
        except httpx.HTTPError:
            return _browse_error("ERROR", root_id)

        if res.status_code in (401, 403):
            return _browse_error("FORBIDDEN", root_id)
        if res.status_code == 404:
            return _browse_error("NOT_FOUND", root_id)
        if res.status_code >= 400:
            return _browse_error("ERROR", root_id)

        body = res.json() or {}

    children = body.get("files") or []
    folders = [
        {"id": item.get("id"), "name": item.get("name") or "Folder"}
        for item in children
        if item.get("mimeType") == FOLDER_MIME and item.get("id")
    ]
    files = [
        _image_item(item)
        for item in children
        if item.get("id") and str(item.get("mimeType") or "").startswith("image/")
    ]

    has_content = bool(folders or files)
    payload = {
        "status": "OK" if (has_content or page_token) else "EMPTY",
        "message": None
        if (has_content or page_token)
        else "Folder Google Drive terbaca, tetapi belum ada foto atau subfolder di dalamnya.",
        "root_folder_id": root_id,
        "folder": {"id": target_id, "name": folder_name},
        "path": path,
        "folders": folders,
        "files": files,
        "next_page_token": body.get("nextPageToken"),
        "is_file": False,
    }
    return _store(_browse_cache, cache_key, payload)


def _image_item(item: Dict[str, Any]) -> Dict[str, Any]:
    file_id = item.get("id") or ""
    return {
        "id": file_id,
        "file_name": item.get("name"),
        "alt_text": item.get("name"),
        "file_type": "IMAGE",
        **_image_urls(file_id),
    }

