"""FastAPI application factory — ALSABBAT Football Club API.

Vercel (serverless):    entrypoint `app.main:app` (lihat vercel.json, services.api)
Development:            uvicorn app.main:app --reload --port 8001
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import close_db
from app.core.errors import register_exception_handlers
from app.core.logging_config import get_logger, setup_logging
from app.services.startup_tasks import run_startup_tasks_once

setup_logging()
logger = get_logger("alsabbat.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "Starting %s v%s (env=%s, serverless=%s)",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.ENVIRONMENT,
        settings.is_serverless,
    )
    # ensure_indexes() + run_bootstrap() TETAP dijalankan, tetapi lewat runner
    # yang aman untuk cold start & concurrent invocation di serverless.
    await run_startup_tasks_once()
    yield
    if not settings.is_serverless:
        # Di serverless client sengaja dibiarkan hidup agar dipakai ulang oleh
        # invocation berikutnya selama instance masih hangat.
        await close_db()
    logger.info("Shutdown complete")


def resolve_cors_origins() -> list[str]:
    """Staging & production di Vercel tidak boleh berjalan dengan CORS wildcard.

    - production: WAJIB daftar eksplisit (gagal start bila wildcard/kosong).
    - staging di Vercel (serverless): WAJIB daftar eksplisit.
    - staging di environment terkelola/preview lokal: hanya peringatan, agar
      lingkungan pengembangan yang sudah berjalan tidak ikut mati.
    """
    origins = [origin for origin in settings.CORS_ORIGINS if origin]
    wildcard = (not origins) or ("*" in origins)
    if wildcard:
        must_fail = settings.is_production or (settings.is_staging and settings.is_serverless)
        message = (
            "CORS_ORIGINS wajib berisi daftar origin eksplisit (tanpa '*') saat "
            f"ENVIRONMENT={settings.ENVIRONMENT}. Contoh production: "
            "CORS_ORIGINS=https://alsabbat.com,https://www.alsabbat.com — contoh staging: "
            "CORS_ORIGINS=https://<nama-deployment-staging>.vercel.app"
        )
        if must_fail:
            raise RuntimeError(message)
        if settings.is_staging:
            logger.warning("CORS wildcard aktif (staging non-Vercel). %s", message)
    return origins or ["*"]


def create_app() -> FastAPI:
    docs_enabled = settings.ENABLE_API_DOCS or not settings.is_production
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Official ALSABBAT Football Club platform API.",
        docs_url=f"{settings.API_PREFIX}/docs" if docs_enabled else None,
        openapi_url=f"{settings.API_PREFIX}/openapi.json" if docs_enabled else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    origins = resolve_cors_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials="*" not in origins,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )

    if settings.SECURITY_HEADERS_ENABLED:

        @app.middleware("http")
        async def security_headers(request, call_next):
            response = await call_next(request)
            response.headers.setdefault("X-Content-Type-Options", "nosniff")
            response.headers.setdefault("X-Frame-Options", "DENY")
            response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
            response.headers.setdefault(
                "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
            )
            if settings.is_production:
                response.headers.setdefault(
                    "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
                )
            return response

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.API_PREFIX)

    @app.get(f"{settings.API_PREFIX}/", tags=["system"])
    async def root():
        return {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "docs": f"{settings.API_PREFIX}/docs" if docs_enabled else None,
            "health": f"{settings.API_PREFIX}/health",
        }

    return app


app = create_app()
