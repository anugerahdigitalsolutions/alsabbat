"""Centralized, environment-driven configuration.

No secret, credential or connection string is ever hard-coded here.
Every value is read from environment variables so the same codebase can run in
development / staging / production (Railway, Vercel, MongoDB Atlas).
"""
from __future__ import annotations

import os
import secrets
from functools import lru_cache
from pathlib import Path
from typing import List

from dotenv import load_dotenv

# Load .env early (development convenience only; production uses real env vars)
ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


def _csv(value: str | None, default: List[str] | None = None) -> List[str]:
    if not value:
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    """Application settings resolved from environment variables."""

    # ---------------------------------------------------------------- app
    APP_NAME: str = os.environ.get("APP_NAME", "ALSABBAT Football Club API")
    APP_VERSION: str = os.environ.get("APP_VERSION", "1.0.0-phase1")
    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", os.environ.get("NODE_ENV", "development"))
    DEBUG: bool = _bool(os.environ.get("DEBUG"), False)
    API_PREFIX: str = "/api"
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")

    # ----------------------------------------------------------- database
    # MONGODB_URI is the canonical (MongoDB Atlas) variable name.
    # MONGO_URL is kept as a fallback for the managed dev environment.
    MONGODB_URI: str = (
        os.environ.get("MONGODB_URI")
        or os.environ.get("MONGO_URL")
        or "mongodb://localhost:27017"
    )
    DB_NAME: str = (
        os.environ.get("MONGODB_DB_NAME")
        or os.environ.get("DB_NAME")
        or "alsabbat_platform"
    )

    # --------------------------------------------------------------- auth
    JWT_SECRET: str = os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY") or ""
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

    # Bootstrap super admin (idempotent seed). Password is only read from env.
    BOOTSTRAP_ADMIN_EMAIL: str = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@alsabbat.com")
    BOOTSTRAP_ADMIN_PASSWORD: str = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
    BOOTSTRAP_ADMIN_NAME: str = os.environ.get("BOOTSTRAP_ADMIN_NAME", "ALSABBAT Super Admin")

    # --------------------------------------------------------------- cors
    CORS_ORIGINS: List[str] = _csv(os.environ.get("CORS_ORIGINS"), ["*"])

    # ------------------------------------------------------ rate limiting
    RATE_LIMIT_ENABLED: bool = _bool(os.environ.get("RATE_LIMIT_ENABLED"), True)
    RATE_LIMIT_LOGIN_MAX: int = int(os.environ.get("RATE_LIMIT_LOGIN_MAX", "10"))
    RATE_LIMIT_LOGIN_WINDOW: int = int(os.environ.get("RATE_LIMIT_LOGIN_WINDOW", "60"))
    RATE_LIMIT_WRITE_MAX: int = int(os.environ.get("RATE_LIMIT_WRITE_MAX", "300"))
    RATE_LIMIT_WRITE_WINDOW: int = int(os.environ.get("RATE_LIMIT_WRITE_WINDOW", "60"))
    RATE_LIMIT_PUBLIC_MAX: int = int(os.environ.get("RATE_LIMIT_PUBLIC_MAX", "600"))
    RATE_LIMIT_PUBLIC_WINDOW: int = int(os.environ.get("RATE_LIMIT_PUBLIC_WINDOW", "60"))

    # -------------------------------------------------------------- media
    # Storage is pluggable: LOCAL (default / dev) or S3 (Atlas-era CDN target).
    MEDIA_STORAGE_PROVIDER: str = os.environ.get("MEDIA_STORAGE_PROVIDER", "LOCAL").upper()
    MEDIA_LOCAL_DIR: str = os.environ.get("MEDIA_LOCAL_DIR", str(ROOT_DIR / "media_storage"))
    MEDIA_PUBLIC_PATH: str = "/api/media/files"
    MEDIA_CDN_BASE_URL: str = os.environ.get("MEDIA_CDN_BASE_URL", "")
    MEDIA_MAX_IMAGE_MB: int = int(os.environ.get("MEDIA_MAX_IMAGE_MB", "10"))
    MEDIA_MAX_VIDEO_MB: int = int(os.environ.get("MEDIA_MAX_VIDEO_MB", "200"))
    MEDIA_MAX_DOCUMENT_MB: int = int(os.environ.get("MEDIA_MAX_DOCUMENT_MB", "20"))

    # S3 / object storage (architecture ready, not required in Phase 1)
    S3_BUCKET_NAME: str = os.environ.get("S3_BUCKET_NAME", "")
    S3_REGION: str = os.environ.get("S3_REGION", "")
    S3_ENDPOINT_URL: str = os.environ.get("S3_ENDPOINT_URL", "")
    S3_ACCESS_KEY_ID: str = os.environ.get("S3_ACCESS_KEY_ID", "")
    S3_SECRET_ACCESS_KEY: str = os.environ.get("S3_SECRET_ACCESS_KEY", "")

    # ------------------------------------- social publishing (Phase 8)
    # Values are read from the environment/secret manager ONLY. Empty value =>
    # the platform reports NOT_CONFIGURED (never a fake publish).
    INSTAGRAM_APP_ID: str = os.environ.get("INSTAGRAM_APP_ID", "")
    INSTAGRAM_APP_SECRET: str = os.environ.get("INSTAGRAM_APP_SECRET", "")
    TIKTOK_CLIENT_KEY: str = os.environ.get("TIKTOK_CLIENT_KEY", "")
    TIKTOK_CLIENT_SECRET: str = os.environ.get("TIKTOK_CLIENT_SECRET", "")
    YOUTUBE_CLIENT_ID: str = os.environ.get("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: str = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
    YOUTUBE_API_KEY: str = os.environ.get("YOUTUBE_API_KEY", "")

    # -------------------------------------------------------------- seo
    PUBLIC_SITE_URL: str = os.environ.get("PUBLIC_SITE_URL", "")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}

    def resolved_jwt_secret(self) -> str:
        """Return the JWT secret; generate an ephemeral one in development."""
        if self.JWT_SECRET:
            return self.JWT_SECRET
        if self.is_production:
            raise RuntimeError("JWT_SECRET environment variable is required in production")
        # Development fallback: ephemeral secret (tokens invalid after restart)
        if not getattr(self, "_ephemeral_secret", None):
            self._ephemeral_secret = secrets.token_urlsafe(48)
        return self._ephemeral_secret


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
