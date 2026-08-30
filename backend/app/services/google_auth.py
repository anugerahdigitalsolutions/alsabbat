"""Fase 3 — Google OAuth 2.0 (authorization code flow) untuk login Baraya.

Client ID & Client Secret HANYA dari environment. Penukaran kode dan verifikasi
id_token dilakukan di server; browser tidak pernah menerima client secret.

REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
"""
from __future__ import annotations

from typing import Any, Dict

import httpx

from app.core.config import settings
from app.core.errors import UnauthorizedError, ValidationFailedError
from app.core.logging_config import get_logger

logger = get_logger(__name__)

TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo"


def google_configured() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def google_status() -> Dict[str, Any]:
    return {
        "configured": google_configured(),
        "client_id": settings.GOOGLE_CLIENT_ID,  # public value by design
        "note": (
            "Login Google aktif."
            if google_configured()
            else "Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di environment server untuk mengaktifkan Login Google."
        ),
    }


async def exchange_code(*, code: str, redirect_uri: str) -> Dict[str, Any]:
    """Tukar authorization code menjadi profil Google yang terverifikasi."""
    if not google_configured():
        raise ValidationFailedError(
            "Login Google belum dikonfigurasi di server. Gunakan email dan kata sandi."
        )

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            token_response = await client.post(
                TOKEN_ENDPOINT,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
        except httpx.HTTPError:
            raise UnauthorizedError("Tidak dapat menghubungi Google. Coba lagi.")

        if token_response.status_code >= 400:
            logger.warning("google.token_exchange_failed http=%s", token_response.status_code)
            raise UnauthorizedError("Kode login Google tidak valid atau sudah dipakai.")

        id_token = (token_response.json() or {}).get("id_token")
        if not id_token:
            raise UnauthorizedError("Google tidak mengirimkan identitas pengguna.")

        try:
            info_response = await client.get(TOKENINFO_ENDPOINT, params={"id_token": id_token})
        except httpx.HTTPError:
            raise UnauthorizedError("Tidak dapat memverifikasi identitas Google.")

    if info_response.status_code >= 400:
        raise UnauthorizedError("Identitas Google tidak dapat diverifikasi.")

    info = info_response.json() or {}
    if info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise UnauthorizedError("Identitas Google bukan untuk aplikasi ini.")
    email = (info.get("email") or "").lower().strip()
    verified = str(info.get("email_verified", "false")).lower() in {"true", "1"}
    if not email or not verified:
        raise UnauthorizedError("Akun Google ini belum memverifikasi emailnya.")

    return {
        "email": email,
        "google_id": info.get("sub", ""),
        "full_name": info.get("name") or email.split("@")[0],
        "picture": info.get("picture") or "",
    }
