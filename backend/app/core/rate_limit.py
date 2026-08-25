"""Lightweight in-memory sliding-window rate limiting.

Good enough as a Phase-1 security baseline; can be swapped for Redis later
without changing the call sites.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import Request

from app.core.config import settings
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
