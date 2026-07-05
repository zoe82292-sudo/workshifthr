from __future__ import annotations

import os
import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

from app.auth import auth_enabled

TRIAL_MAX_ROWS = int(os.getenv("TRIAL_MAX_ROWS", "250"))
TRIAL_MAX_FILES = int(os.getenv("TRIAL_MAX_FILES", "1"))
TRIAL_PREVIEW_WINDOW_SECONDS = 3600
TRIAL_ANALYZE_WINDOW_SECONDS = 86400
TRIAL_ANALYZE_LIMIT = int(os.getenv("TRIAL_ANALYZE_LIMIT", "1"))
TRIAL_PREVIEW_LIMIT = int(os.getenv("TRIAL_PREVIEW_LIMIT", "15"))

_trial_buckets: dict[str, list[float]] = defaultdict(list)
_trial_lock = Lock()


def trial_enabled() -> bool:
    if not auth_enabled():
        return False
    return os.getenv("TRIAL_ENABLED", "true").strip().lower() not in {"0", "false", "no"}


def trial_status() -> dict[str, int | bool]:
    return {
        "trial_enabled": trial_enabled(),
        "trial_max_rows": TRIAL_MAX_ROWS,
        "trial_max_files": TRIAL_MAX_FILES,
    }


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def enforce_trial_rate_limit(request: Request, *, analyze: bool) -> None:
    limit = TRIAL_ANALYZE_LIMIT if analyze else TRIAL_PREVIEW_LIMIT
    window = TRIAL_ANALYZE_WINDOW_SECONDS if analyze else TRIAL_PREVIEW_WINDOW_SECONDS
    key = f"{_client_key(request)}:{'analyze' if analyze else 'preview'}"
    now = time.monotonic()
    cutoff = now - window

    with _trial_lock:
        hits = [stamp for stamp in _trial_buckets[key] if stamp >= cutoff]
        if len(hits) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "Free trial analyze limit reached for today. "
                    if analyze
                    else "Free trial preview limit reached for now. "
                )
                + "Purchase access for unlimited uploads or try again later.",
            )
        hits.append(now)
        _trial_buckets[key] = hits


def enforce_trial_file_count(file_count: int) -> None:
    if file_count > TRIAL_MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Free trial supports {TRIAL_MAX_FILES} file at a time. "
                "Purchase access to merge multiple HRIS exports."
            ),
        )


def enforce_trial_row_count(row_count: int) -> None:
    if row_count > TRIAL_MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Free trial supports up to {TRIAL_MAX_ROWS:,} rows. "
                f"Your file has {row_count:,} rows. Purchase access for larger files."
            ),
        )
