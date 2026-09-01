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
from typing import List, Optional

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


def _clean(value: str | None, default: str = "") -> str:
    """Nilai environment yang dibersihkan (tanpa pernah menampilkan isinya).

    Kredensial yang ditempel lewat dashboard (Vercel/Railway) sering membawa
    spasi, newline, atau tanda kutip pembungkus yang tak terlihat. Pada
    Cloudinary hal ini membuat signature upload menjadi tidak valid meskipun
    nilainya "terlihat" benar.
    """
    if value is None:
        return default
    cleaned = value.strip().strip("'\"").strip()
    return cleaned or default


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
    # Connection pool — nilai default disetel untuk serverless (Vercel Functions):
    # pool kecil per instance + minPoolSize 0 agar koneksi Atlas tidak habis.
    MONGODB_MAX_POOL_SIZE: int = int(os.environ.get("MONGODB_MAX_POOL_SIZE", "10"))
    MONGODB_MIN_POOL_SIZE: int = int(os.environ.get("MONGODB_MIN_POOL_SIZE", "0"))
    MONGODB_MAX_IDLE_TIME_MS: int = int(os.environ.get("MONGODB_MAX_IDLE_TIME_MS", "30000"))
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = int(
        os.environ.get("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "8000")
    )
    MONGODB_CONNECT_TIMEOUT_MS: int = int(os.environ.get("MONGODB_CONNECT_TIMEOUT_MS", "8000"))
    MONGODB_SOCKET_TIMEOUT_MS: int = int(os.environ.get("MONGODB_SOCKET_TIMEOUT_MS", "20000"))
    # Interval minimum antar eksekusi startup task (index + bootstrap admin) agar
    # cold start berulang di serverless tidak menjalankan operasi berat tiap kali.
    STARTUP_TASKS_MIN_INTERVAL_MINUTES: int = int(
        os.environ.get("STARTUP_TASKS_MIN_INTERVAL_MINUTES", "360")
    )

    # --------------------------------------------------------------- auth
    JWT_SECRET: str = os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY") or ""
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
    CUSTOMER_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("CUSTOMER_TOKEN_EXPIRE_MINUTES", "1440"))

    # Bootstrap super admin (idempotent seed). Password is only read from env.
    BOOTSTRAP_ADMIN_EMAIL: str = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@alsabbat.com")
    BOOTSTRAP_ADMIN_PASSWORD: str = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
    BOOTSTRAP_ADMIN_NAME: str = os.environ.get("BOOTSTRAP_ADMIN_NAME", "ALSABBAT Super Admin")
    # Reset password bootstrap admin (hash bcrypt) memakai BOOTSTRAP_ADMIN_PASSWORD
    # yang aktif. HANYA berlaku pada staging/preview — production selalu diabaikan.
    BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET: bool = _bool(
        os.environ.get("BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET"), False
    )

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
    # Sensitive endpoints (MongoDB-backed, shared across instances)
    RATE_LIMIT_CHECKOUT_MAX: int = int(os.environ.get("RATE_LIMIT_CHECKOUT_MAX", "10"))
    RATE_LIMIT_CHECKOUT_WINDOW: int = int(os.environ.get("RATE_LIMIT_CHECKOUT_WINDOW", "300"))
    RATE_LIMIT_WEBHOOK_MAX: int = int(os.environ.get("RATE_LIMIT_WEBHOOK_MAX", "120"))
    RATE_LIMIT_WEBHOOK_WINDOW: int = int(os.environ.get("RATE_LIMIT_WEBHOOK_WINDOW", "60"))

    # -------------------------------------------------------------- media
    # Storage is pluggable: LOCAL (default — dev and self-hosted/aaPanel), S3 or
    # EMERGENT (managed object storage).
    MEDIA_STORAGE_PROVIDER: str = os.environ.get("MEDIA_STORAGE_PROVIDER", "LOCAL").upper()
    MEDIA_LOCAL_DIR: str = os.environ.get("MEDIA_LOCAL_DIR", str(ROOT_DIR / "media_storage"))
    # On a self-hosted deployment (aaPanel + Nginx) the LOCAL directory lives on a
    # real server disk and IS persistent across releases — as long as MEDIA_LOCAL_DIR
    # points outside the deployment folder. Ephemeral containers must leave this
    # false so the platform never over-claims durability.
    MEDIA_LOCAL_PERSISTENT: bool = _bool(os.environ.get("MEDIA_LOCAL_PERSISTENT"), False)
    MEDIA_PUBLIC_PATH: str = "/api/media/files"
    MEDIA_CDN_BASE_URL: str = os.environ.get("MEDIA_STORAGE_PUBLIC_BASE_URL", "") or os.environ.get("MEDIA_CDN_BASE_URL", "")
    MEDIA_STORAGE_BUCKET: str = os.environ.get("MEDIA_STORAGE_BUCKET", "")
    MEDIA_STORAGE_REGION: str = os.environ.get("MEDIA_STORAGE_REGION", "")
    MEDIA_STORAGE_ENDPOINT: str = os.environ.get("MEDIA_STORAGE_ENDPOINT", "")
    MEDIA_STORAGE_PREFIX: str = os.environ.get("MEDIA_STORAGE_PREFIX", "alsabbat")
    INTEGRATION_PROXY_URL: str = os.environ.get("INTEGRATION_PROXY_URL", "")
    EMERGENT_LLM_KEY: str = os.environ.get("EMERGENT_LLM_KEY", "")
    MEDIA_MAX_IMAGE_MB: int = int(os.environ.get("MEDIA_MAX_IMAGE_MB", "10"))
    MEDIA_MAX_VIDEO_MB: int = int(os.environ.get("MEDIA_MAX_VIDEO_MB", "200"))
    MEDIA_MAX_DOCUMENT_MB: int = int(os.environ.get("MEDIA_MAX_DOCUMENT_MB", "20"))

    # S3 / object storage (architecture ready, not required in Phase 1)
    S3_BUCKET_NAME: str = os.environ.get("S3_BUCKET_NAME", "")
    S3_REGION: str = os.environ.get("S3_REGION", "")
    S3_ENDPOINT_URL: str = os.environ.get("S3_ENDPOINT_URL", "")
    S3_ACCESS_KEY_ID: str = os.environ.get("S3_ACCESS_KEY_ID", "")
    S3_SECRET_ACCESS_KEY: str = os.environ.get("S3_SECRET_ACCESS_KEY", "")

    # ------------------------------------------------ Cloudinary (media CDN)
    # Dipakai bila MEDIA_STORAGE_PROVIDER=CLOUDINARY. Kredensial HANYA dari
    # environment. Staging & production memakai folder berbeda lewat
    # CLOUDINARY_FOLDER (fallback: MEDIA_STORAGE_PREFIX) sehingga media tidak
    # pernah tercampur antar environment.
    CLOUDINARY_CLOUD_NAME: str = _clean(os.environ.get("CLOUDINARY_CLOUD_NAME"))
    CLOUDINARY_API_KEY: str = _clean(os.environ.get("CLOUDINARY_API_KEY"))
    CLOUDINARY_API_SECRET: str = _clean(os.environ.get("CLOUDINARY_API_SECRET"))
    # Opsional: hanya dipakai bila memang preset dibutuhkan oleh akun Cloudinary.
    CLOUDINARY_UPLOAD_PRESET: str = _clean(os.environ.get("CLOUDINARY_UPLOAD_PRESET"))
    CLOUDINARY_FOLDER: str = _clean(os.environ.get("CLOUDINARY_FOLDER"))
    CLOUDINARY_URL: str = _clean(os.environ.get("CLOUDINARY_URL"))
    # Algoritma signature akun Cloudinary (Settings -> Security). Default sha1;
    # set ke "sha256" bila akun memakai SHA-256.
    CLOUDINARY_SIGNATURE_ALGORITHM: str = (
        _clean(os.environ.get("CLOUDINARY_SIGNATURE_ALGORITHM"), "sha1").lower() or "sha1"
    )

    # ------------------------------------------------ serverless / Vercel
    # Vercel menyetel VERCEL=1 di runtime function.
    @property
    def is_serverless(self) -> bool:
        return bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))

    @property
    def mongodb_uri_is_local(self) -> bool:
        uri = (self.MONGODB_URI or "").lower()
        return ("localhost" in uri) or ("127.0.0.1" in uri) or ("@mongo:" in uri)

    def unsafe_db_config_reason(self) -> Optional[str]:
        """Alasan konfigurasi database TIDAK aman untuk staging/production.

        Tidak pernah menampilkan connection string / kredensial apa pun.
        """
        if not (self.is_production or self.is_staging):
            return None
        if not (os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL")):
            return "MONGODB_URI belum diset (aplikasi akan memakai fallback development)"
        if self.mongodb_uri_is_local:
            return "MONGODB_URI menunjuk ke localhost/127.0.0.1 (database lokal/VPS)"
        if not (os.environ.get("MONGODB_DB_NAME") or os.environ.get("DB_NAME")):
            return "MONGODB_DB_NAME belum diset (aplikasi akan memakai nama database default)"
        # Isolasi environment: staging & production tidak boleh memakai nama
        # database yang sama / tertukar.
        db_name = (self.DB_NAME or "").strip().lower()
        if self.is_production and "staging" in db_name:
            return (
                "MONGODB_DB_NAME mengandung 'staging' padahal ENVIRONMENT=production "
                "(risiko production memakai database staging)"
            )
        if self.is_staging and db_name == "alsabbat_platform":
            return (
                "MONGODB_DB_NAME sama dengan nama database production ('alsabbat_platform') "
                "padahal ENVIRONMENT=staging — pakai database terpisah, misalnya "
                "alsabbat_platform_staging"
            )
        return None

    @property
    def cloudinary_folder(self) -> str:
        """Folder/prefix Cloudinary aktif (env-driven, terpisah per environment)."""
        folder = (self.CLOUDINARY_FOLDER or self.MEDIA_STORAGE_PREFIX or "alsabbat").strip("/")
        return folder

    @property
    def cloudinary_configured(self) -> bool:
        if self.CLOUDINARY_URL.strip():
            return True
        return bool(
            self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY and self.CLOUDINARY_API_SECRET
        )

    def missing_cloudinary_vars(self) -> List[str]:
        """Nama variable yang belum diisi (tanpa pernah menampilkan nilainya)."""
        if self.CLOUDINARY_URL.strip():
            return []
        missing = []
        if not self.CLOUDINARY_CLOUD_NAME:
            missing.append("CLOUDINARY_CLOUD_NAME")
        if not self.CLOUDINARY_API_KEY:
            missing.append("CLOUDINARY_API_KEY")
        if not self.CLOUDINARY_API_SECRET:
            missing.append("CLOUDINARY_API_SECRET")
        return missing

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
    # Fase 1 — OAuth koneksi akun sosial (redirect URI harus sama persis dengan
    # yang didaftarkan di developer console masing-masing platform)
    INSTAGRAM_REDIRECT_URI: str = os.environ.get("INSTAGRAM_REDIRECT_URI", "")
    TIKTOK_REDIRECT_URI: str = os.environ.get("TIKTOK_REDIRECT_URI", "")
    YOUTUBE_REDIRECT_URI: str = os.environ.get("YOUTUBE_REDIRECT_URI", "")
    SOCIAL_TOKEN_ENCRYPTION_KEY: str = os.environ.get("SOCIAL_TOKEN_ENCRYPTION_KEY", "")

    # ---------------------------- galeri Google Drive (folder publik + API key)
    # Kosong => album Drive melaporkan NOT_CONFIGURED (tidak pernah mengklaim
    # berhasil). Tidak ada OAuth dan tidak ada password Google yang disimpan.
    GOOGLE_DRIVE_API_KEY: str = os.environ.get("GOOGLE_DRIVE_API_KEY", "")

    # -------------------------------------------------------------- seo
    PUBLIC_SITE_URL: str = os.environ.get("PUBLIC_SITE_URL", "")

    # ------------------------------------------------- mail (Phase 14)
    # MAIL_PROVIDER: SMTP (real delivery) | LOG (no delivery, audit log only)
    # | MEMORY (in-memory, tests only). Empty/unset => LOG.
    MAIL_PROVIDER: str = os.environ.get("MAIL_PROVIDER", "LOG")
    MAIL_FROM: str = os.environ.get("MAIL_FROM", "")
    MAIL_FROM_NAME: str = os.environ.get("MAIL_FROM_NAME", "ALSABBAT Football Club")
    SMTP_HOST: str = os.environ.get("SMTP_HOST", "")
    SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.environ.get("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = _bool(os.environ.get("SMTP_USE_TLS"), True)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = int(
        os.environ.get("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30")
    )

    # ------------------------------ SMTP2GO API (Fase 3 — OTP & reset email)
    # Kosong => provider melaporkan NOT_CONFIGURED (tidak pernah mengklaim
    # email terkirim). Kredensial HANYA dari environment.
    SMTP2GO_API_KEY: str = os.environ.get("SMTP2GO_API_KEY", "")
    SMTP2GO_SENDER_EMAIL: str = os.environ.get("SMTP2GO_SENDER_EMAIL", "")
    SMTP2GO_SENDER_NAME: str = os.environ.get("SMTP2GO_SENDER_NAME", "AL SABBAT Football Club")

    # --------------------------------- Google OAuth (Fase 3 — Login Google)
    GOOGLE_CLIENT_ID: str = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")

    # --------------------------- Firebase Cloud Messaging (Fase 4A — notifikasi admin)
    # Kosong => status NOT_CONFIGURED yang jujur; TIDAK ada notifikasi dummy.
    FIREBASE_PROJECT_ID: str = os.environ.get("FIREBASE_PROJECT_ID", "")
    FIREBASE_SERVICE_ACCOUNT_JSON: str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    FIREBASE_ADMIN_TOPIC: str = os.environ.get("FIREBASE_ADMIN_TOPIC", "admin-review")

    # ------------------------------------------------- OTP (Fase 3)
    OTP_EXPIRE_MINUTES: int = int(os.environ.get("OTP_EXPIRE_MINUTES", "10"))
    OTP_MAX_ATTEMPTS: int = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))


    # ---------------------------------------------------- hardening flags
    # Interactive API docs are disabled in production unless explicitly enabled.
    ENABLE_API_DOCS: bool = _bool(os.environ.get("ENABLE_API_DOCS"), False)
    SECURITY_HEADERS_ENABLED: bool = _bool(os.environ.get("SECURITY_HEADERS_ENABLED"), True)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}

    @property
    def is_staging(self) -> bool:
        return self.ENVIRONMENT.lower() in {"staging", "stage"}

    @property
    def bootstrap_admin_password_reset_enabled(self) -> bool:
        """Boleh menyelaraskan password bootstrap admin dengan env?

        Aktif HANYA bila: flag env dinyalakan, BOOTSTRAP_ADMIN_PASSWORD terisi,
        environment BUKAN production, dan environment adalah staging/preview.
        Production TIDAK pernah terpengaruh.
        """
        if not (self.BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET and self.BOOTSTRAP_ADMIN_PASSWORD):
            return False
        if self.is_production:
            return False
        vercel_env = (os.environ.get("VERCEL_ENV") or "").strip().lower()
        return self.is_staging or vercel_env in {"preview", "development"}

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
