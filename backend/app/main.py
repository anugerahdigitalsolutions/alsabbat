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


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Official ALSABBAT Football Club platform API — Phase 1 foundation.",
        docs_url=f"{settings.API_PREFIX}/docs",
        openapi_url=f"{settings.API_PREFIX}/openapi.json",
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.API_PREFIX)

    @app.get(f"{settings.API_PREFIX}/", tags=["system"])
    async def root():
        return {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "phase": "Phase 1 — Foundation",
            "docs": f"{settings.API_PREFIX}/docs",
            "health": f"{settings.API_PREFIX}/health",
        }

    return app


app = create_app()
