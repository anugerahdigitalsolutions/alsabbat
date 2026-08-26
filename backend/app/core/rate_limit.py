"""Rate limiting.

Two layers, same call-site contract:

* `check()` / `*_rate_limit()`  — in-memory fixed window (single instance, cheap).
* `enforce()`                   — MongoDB-backed counter, shared across every
  backend instance (Railway may run more than one). Used for sensitive
  endpoints only: login, checkout, payment initiation and payment webhook.

If MongoDB is momentarily unavailable the limiter degrades to the in-memory
window instead of failing the request.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict

from fastapi import Request
from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.core.database import Collections, get_db
from app.core.errors import RateLimitError

_buckets: Dict[str, Deque[float]] = defaultdict(deque)


def client_key(request: Request, scope: str) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    return f"{scope}:{ip}"


def check(key: str, max_requests: int, window_seconds: int) -> None:
    if not settings.RATE_LIMIT_ENABLED:
        return
    now = time.time()
    bucket = _buckets[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= max_requests:
        raise RateLimitError()
    bucket.append(now)


def login_rate_limit(request: Request) -> None:
    check(
        client_key(request, "login"),
        settings.RATE_LIMIT_LOGIN_MAX,
        settings.RATE_LIMIT_LOGIN_WINDOW,
    )


def write_rate_limit(request: Request) -> None:
    check(
        client_key(request, "write"),
        settings.RATE_LIMIT_WRITE_MAX,
        settings.RATE_LIMIT_WRITE_WINDOW,
    )


def public_rate_limit(request: Request) -> None:
    check(
        client_key(request, "public"),
        settings.RATE_LIMIT_PUBLIC_MAX,
        settings.RATE_LIMIT_PUBLIC_WINDOW,
    )


# --------------------------------------------------- MongoDB-backed limiter
async def enforce(request: Request, scope: str, max_requests: int, window_seconds: int) -> None:
    """Distributed fixed-window limiter for sensitive endpoints."""
    if not settings.RATE_LIMIT_ENABLED:
        return
    key = client_key(request, scope)
    now = datetime.now(timezone.utc)
    try:
        coll = get_db()[Collections.RATE_LIMITS]
        doc = await coll.find_one_and_update(
            {"_id": key, "window_start": {"$gt": now - timedelta(seconds=window_seconds)}},
            {"$inc": {"count": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if doc is None:
            await coll.replace_one(
                {"_id": key},
                {
                    "window_start": now,
                    "count": 1,
                    "expires_at": now + timedelta(seconds=window_seconds),
                },
                upsert=True,
            )
            return
    except PyMongoError:
        check(key, max_requests, window_seconds)
        return
    if int(doc.get("count", 0)) > max_requests:
        raise RateLimitError()


async def login_guard(request: Request) -> None:
    await enforce(request, "login", settings.RATE_LIMIT_LOGIN_MAX, settings.RATE_LIMIT_LOGIN_WINDOW)


async def checkout_guard(request: Request) -> None:
    await enforce(
        request, "checkout", settings.RATE_LIMIT_CHECKOUT_MAX, settings.RATE_LIMIT_CHECKOUT_WINDOW
    )


async def webhook_guard(request: Request) -> None:
    await enforce(
        request, "webhook", settings.RATE_LIMIT_WEBHOOK_MAX, settings.RATE_LIMIT_WEBHOOK_WINDOW
    )
