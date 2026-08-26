"""FastAPI application factory — ALSABBAT Football Club API.

Production (Railway):   uvicorn app.main:app --host 0.0.0.0 --port $PORT
Development:            uvicorn app.main:app --reload --port 8001
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import close_db, ensure_indexes, ping
from app.core.errors import register_exception_handlers
from app.core.logging_config import get_logger, setup_logging
from app.services.bootstrap import run_bootstrap

setup_logging()
logger = get_logger("alsabbat.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "Starting %s v%s (env=%s)", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT
    )
    if await ping():
        await ensure_indexes()
        await run_bootstrap()
    else:
        logger.error("Database unreachable at startup — API will serve degraded health status")
    yield
    await close_db()
    logger.info("Shutdown complete")


def resolve_cors_origins() -> list[str]:
    """Production must never run with a wildcard CORS policy."""
    origins = [origin for origin in settings.CORS_ORIGINS if origin]
    if settings.is_production and (not origins or "*" in origins):
        raise RuntimeError(
            "CORS_ORIGINS must list the exact production origins (no '*') when "
            "ENVIRONMENT=production. Example: "
            "CORS_ORIGINS=https://alsabbat.com,https://www.alsabbat.com"
        )
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
