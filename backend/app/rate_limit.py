from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

_WINDOW_SECONDS = 60
_LIMITS: dict[str, int] = {
    "/api/auth/login": 20,
    "/api/auth/recover-access": 8,
    "/api/analytics/event": 60,
    "/api/billing/portal": 10,
    "/api/analyze": 30,
    "/api/preview": 60,
    "/api/billing/checkout": 20,
}
_DEFAULT_LIMIT = 120

_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    host = forwarded or (request.client.host if request.client else "unknown")
    return host


def enforce_rate_limit(request: Request) -> None:
    path = request.url.path
    limit = _LIMITS.get(path, _DEFAULT_LIMIT)
    key = f"{_client_key(request)}:{path}"
    now = time.monotonic()
    cutoff = now - _WINDOW_SECONDS

    with _lock:
        hits = [stamp for stamp in _buckets[key] if stamp >= cutoff]
        if len(hits) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a moment and try again.",
            )
        hits.append(now)
        _buckets[key] = hits
