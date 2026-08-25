"""Consistent API error handling."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class AppError(HTTPException):
    def __init__(self, status_code: int, message: str, code: str = "app_error"):
        super().__init__(status_code=status_code, detail=message)
        self.code = code


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, message, "not_found")


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(status.HTTP_409_CONFLICT, message, "conflict")


class ValidationFailedError(AppError):
    def __init__(self, message: str = "Invalid input"):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, message, "validation_error")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, message, "unauthorized")


class ForbiddenError(AppError):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(status.HTTP_403_FORBIDDEN, message, "forbidden")


class RateLimitError(AppError):
    def __init__(self, message: str = "Too many requests, please slow down"):
        super().__init__(status.HTTP_429_TOO_MANY_REQUESTS, message, "rate_limited")


def _payload(code: str, message: str, extra: dict | None = None) -> dict:
    body = {"success": False, "error": {"code": code, "message": message}}
    if extra:
        body["error"].update(extra)
    return body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content=_payload(exc.code, str(exc.detail)))

    @app.exception_handler(HTTPException)
    async def _http_error(_: Request, exc: HTTPException):
        code = getattr(exc, "code", None) or f"http_{exc.status_code}"
        return JSONResponse(
            status_code=exc.status_code,
            content=_payload(code, str(exc.detail)),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_payload(
                "validation_error",
                "Request validation failed",
                {"details": jsonable_encoder(exc.errors())},
            ),
        )

    @app.exception_handler(DuplicateKeyError)
    async def _duplicate_error(_: Request, exc: DuplicateKeyError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_payload("conflict", "A record with the same unique value already exists"),
        )

    @app.exception_handler(PyMongoError)
    async def _mongo_error(_: Request, exc: PyMongoError):
        logger.error("Database error: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=_payload("database_unavailable", "Database is currently unavailable"),
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        logger.exception("Unhandled server error: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_payload("internal_error", "An unexpected error occurred"),
        )
