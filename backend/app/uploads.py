from __future__ import annotations

import os

from fastapi import HTTPException, UploadFile, status

DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def max_upload_bytes() -> int:
    raw = os.getenv("MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)).strip()
    try:
        return max(1, int(raw))
    except ValueError:
        return DEFAULT_MAX_UPLOAD_BYTES


async def read_upload_bytes(file: UploadFile) -> bytes:
    limit = max_upload_bytes()
    content = await file.read()
    if len(content) > limit:
        megabytes = limit // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. Maximum upload size is {megabytes} MB.",
        )
    return content
