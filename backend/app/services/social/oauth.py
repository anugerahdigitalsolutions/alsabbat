"""Fase 1 — koneksi akun sosial lewat OAuth RESMI (connect / disconnect / status).

Tidak ada publishing, upload, queue, maupun scheduler di modul ini.

Aturan keamanan yang ditegakkan di sini:
  * client id/secret hanya dibaca dari environment (server-side)
  * password akun sosial tidak pernah diminta maupun disimpan
  * access/refresh token disimpan TERENKRIPSI (Fernet) dan tidak pernah
    dikirim ke frontend atau ditulis ke log
  * OAuth state single-use + expiry (proteksi CSRF)
  * scope minimum: hanya identitas akun (tanpa scope publish/upload)
"""
from __future__ import annotations

import base64
import hashlib
import secrets
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings
from app.core.database import Collections, get_db
from app.models.base import new_id, utcnow
from app.models.social import SocialConnectionStatus

STATE_TTL_SECONDS = 600
HTTP_TIMEOUT = 20.0

# Scope MINIMUM — hanya untuk memperoleh identitas akun (tidak ada publish/upload)
PROVIDERS_META: Dict[str, Dict[str, Any]] = {
    "INSTAGRAM": {
        "label": "Instagram",
        "scope": "instagram_business_basic",
        "authorize_url": "https://www.instagram.com/oauth/authorize",
        "token_url": "https://api.instagram.com/oauth/access_token",
        "official_api": "Instagram API with Instagram Login (Meta)",
        "env": ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET", "INSTAGRAM_REDIRECT_URI"],
        "requirements": [
            "Meta App (tipe Business) dengan produk Instagram → API setup with Instagram login",
            "Akun Instagram Professional (Business/Creator)",
            "Redirect URI terdaftar di Business login settings",
        ],
    },
    "TIKTOK": {
        "label": "TikTok",
        "scope": "user.info.basic",
        "authorize_url": "https://www.tiktok.com/v2/auth/authorize/",
        "token_url": "https://open.tiktokapis.com/v2/oauth/token/",
        "official_api": "TikTok Login Kit v2",
        "env": ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"],
        "requirements": [
            "TikTok Developer App dengan produk Login Kit (Web)",
            "Web Redirect URI terdaftar persis sama",
        ],
    },
    "YOUTUBE": {
        "label": "YouTube",
        "scope": "https://www.googleapis.com/auth/youtube.readonly",
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "official_api": "YouTube Data API v3 (Google OAuth 2.0)",
        "env": ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REDIRECT_URI"],
        "requirements": [
            "Google Cloud project dengan YouTube Data API v3 aktif",
            "OAuth client ID tipe Web application",
            "Authorized redirect URI terdaftar persis sama",
        ],
    },
}

PLATFORMS: List[str] = list(PROVIDERS_META.keys())


def provider(platform: str) -> Dict[str, Any]:
    """Konfigurasi provider + kredensial dari environment (tanpa pernah di-log)."""
    meta = PROVIDERS_META.get(platform)
    if meta is None:
        raise KeyError(platform)
    if platform == "INSTAGRAM":
        creds = {
            "client_id": settings.INSTAGRAM_APP_ID,
            "client_secret": settings.INSTAGRAM_APP_SECRET,
            "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
        }
    elif platform == "TIKTOK":
        creds = {
            "client_id": settings.TIKTOK_CLIENT_KEY,
            "client_secret": settings.TIKTOK_CLIENT_SECRET,
            "redirect_uri": settings.TIKTOK_REDIRECT_URI,
        }
    else:
        creds = {
            "client_id": settings.YOUTUBE_CLIENT_ID,
            "client_secret": settings.YOUTUBE_CLIENT_SECRET,
            "redirect_uri": settings.YOUTUBE_REDIRECT_URI,
        }
    return {"platform": platform, **meta, **creds}


def missing_env(platform: str) -> List[str]:
    cfg = provider(platform)
    keys = cfg["env"]
    values = [cfg["client_id"], cfg["client_secret"], cfg["redirect_uri"]]
    return [key for key, value in zip(keys, values) if not value]


def is_configured(platform: str) -> bool:
    return not missing_env(platform)


# --------------------------------------------------------------- encryption
def _fernet() -> Optional[Fernet]:
    """Kunci enkripsi token: env khusus bila ada, jika tidak turunkan dari JWT_SECRET."""
    secret = settings.SOCIAL_TOKEN_ENCRYPTION_KEY or settings.JWT_SECRET
    if not secret:
        return None
    key = base64.urlsafe_b64encode(hashlib.sha256(f"social-oauth:{secret}".encode()).digest())
    return Fernet(key)


def encrypt_token(value: Optional[str]) -> Optional[str]:
    box = _fernet()
    if not value or box is None:
        return None
    return box.encrypt(value.encode()).decode()


def decrypt_token(value: Optional[str]) -> Optional[str]:
    box = _fernet()
    if not value or box is None:
        return None
    try:
        return box.decrypt(value.encode()).decode()
    except InvalidToken:
        return None


# -------------------------------------------------------------- oauth state
async def create_state(platform: str, admin_id: str) -> str:
    state = secrets.token_urlsafe(32)
    await get_db()[Collections.SOCIAL_OAUTH_STATES].insert_one(
        {
            "id": new_id(),
            "state": state,
            "platform": platform,
            "admin_id": admin_id,
            "expires_at": time.time() + STATE_TTL_SECONDS,
            "created_at": utcnow(),
        }
    )
    return state


async def consume_state(platform: str, state: Optional[str]) -> Optional[Dict[str, Any]]:
    """State wajib ada, cocok platform, single-use, dan belum kedaluwarsa."""
    if not state:
        return None
    coll = get_db()[Collections.SOCIAL_OAUTH_STATES]
    doc = await coll.find_one_and_delete({"state": state, "platform": platform})
    if not doc or float(doc.get("expires_at") or 0) < time.time():
        return None
    return doc


def authorize_url(platform: str, state: str) -> str:
    cfg = provider(platform)
    params = {
        "client_id" if platform != "TIKTOK" else "client_key": cfg["client_id"],
        "redirect_uri": cfg["redirect_uri"],
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
    }
    if platform == "YOUTUBE":
        params.update({"access_type": "offline", "include_granted_scopes": "true", "prompt": "consent"})
    return f"{cfg['authorize_url']}?{urlencode(params)}"


# ----------------------------------------------------------- token exchange
async def exchange_code(platform: str, code: str) -> Dict[str, Any]:
    cfg = provider(platform)
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        if platform == "INSTAGRAM":
            res = await client.post(
                cfg["token_url"],
                data={
                    "client_id": cfg["client_id"],
                    "client_secret": cfg["client_secret"],
                    "grant_type": "authorization_code",
                    "redirect_uri": cfg["redirect_uri"],
                    "code": code,
                },
            )
            res.raise_for_status()
            payload = res.json()
            short = (payload.get("data") or [payload])[0]
            short_token = short.get("access_token")
            long_res = await client.get(
                "https://graph.instagram.com/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": cfg["client_secret"],
                    "access_token": short_token,
                },
            )
            long_res.raise_for_status()
            long_payload = long_res.json()
            return {
                "access_token": long_payload.get("access_token") or short_token,
                "refresh_token": None,
                "expires_at": time.time() + float(long_payload.get("expires_in") or 0),
            }

        data = {
            "client_secret": cfg["client_secret"],
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": cfg["redirect_uri"],
        }
        data["client_key" if platform == "TIKTOK" else "client_id"] = cfg["client_id"]
        res = await client.post(cfg["token_url"], data=data)
        res.raise_for_status()
        payload = res.json()
        body = payload.get("data") or payload
        return {
            "access_token": body.get("access_token"),
            "refresh_token": body.get("refresh_token"),
            "expires_at": time.time() + float(body.get("expires_in") or 0),
        }


async def fetch_identity(platform: str, access_token: str) -> Dict[str, Optional[str]]:
    """Identitas akun/channel saja — tidak ada data sosial lain yang disimpan."""
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        if platform == "INSTAGRAM":
            res = await client.get(
                "https://graph.instagram.com/me",
                params={"fields": "user_id,username", "access_token": access_token},
            )
            res.raise_for_status()
            body = res.json()
            return {"account_id": str(body.get("user_id") or body.get("id") or ""), "account_name": body.get("username")}
        if platform == "TIKTOK":
            res = await client.get(
                "https://open.tiktokapis.com/v2/user/info/",
                params={"fields": "open_id,display_name"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            res.raise_for_status()
            user = ((res.json().get("data") or {}).get("user")) or {}
            return {"account_id": user.get("open_id"), "account_name": user.get("display_name")}
        res = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "snippet", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        res.raise_for_status()
        items = res.json().get("items") or []
        if not items:
            return {"account_id": None, "account_name": None}
        return {"account_id": items[0].get("id"), "account_name": (items[0].get("snippet") or {}).get("title")}


async def revoke(platform: str, access_token: Optional[str], account_id: Optional[str]) -> bool:
    """Revoke di platform bila API resmi mendukung; kegagalan tidak memblokir disconnect."""
    if not access_token:
        return False
    cfg = provider(platform)
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            if platform == "TIKTOK":
                await client.post(
                    "https://open.tiktokapis.com/v2/oauth/revoke/",
                    data={
                        "client_key": cfg["client_id"],
                        "client_secret": cfg["client_secret"],
                        "token": access_token,
                    },
                )
            elif platform == "YOUTUBE":
                await client.post("https://oauth2.googleapis.com/revoke", data={"token": access_token})
            elif platform == "INSTAGRAM" and account_id:
                await client.delete(
                    f"https://graph.facebook.com/{account_id}/permissions",
                    params={"access_token": access_token},
                )
        return True
    except httpx.HTTPError:
        return False


def connection_state(platform: str, doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """State aman untuk UI — tidak pernah memuat token."""
    cfg = provider(platform)
    configured = is_configured(platform)
    enabled = True if doc is None else bool(doc.get("enabled", True))
    if not configured:
        status = SocialConnectionStatus.NOT_CONFIGURED.value
    elif not doc or not doc.get("access_token_enc"):
        # Fase 4 — status eksplisit sesuai kondisi nyata (bukan "tidak ada data").
        status = "DISCONNECTED"
    elif doc.get("status") == "ERROR":
        status = "ERROR"
    elif doc.get("expires_at") and float(doc["expires_at"]) <= time.time():
        status = SocialConnectionStatus.EXPIRED.value
    else:
        status = SocialConnectionStatus.CONNECTED.value
    return {
        "platform": platform,
        "label": cfg["label"],
        "status": status,
        "configured": configured,
        "enabled": enabled,
        "missing_env": missing_env(platform),
        "requirements": cfg["requirements"],
        "official_api": cfg["official_api"],
        "scope": cfg["scope"],
        "account_id": (doc or {}).get("account_id"),
        "account_name": (doc or {}).get("account_name"),
        "connected_at": (doc or {}).get("connected_at"),
        "updated_at": (doc or {}).get("updated_at"),
        "error_message": (doc or {}).get("error_message"),
    }
