from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.analyzer import analyze_file, preview_file
from app.auth import (
    LoginRequest,
    LoginResponse,
    auth_enabled,
    authenticate_user,
    create_access_token,
    require_auth,
)
from app.models import AnalysisResult, ColumnMapping, PreviewResponse

ROOT_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = ROOT_DIR / "frontend" / "dist"
SAMPLE_DATA_FILE = ROOT_DIR / "sample-data" / "compensation-sample.csv"
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app = FastAPI(title="WorkShift HR Compensation Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "auth_enabled": auth_enabled(),
        "git_commit": os.getenv("RENDER_GIT_COMMIT", "local"),
        "frontend_bundle": _frontend_bundle_name(),
    }


def _frontend_bundle_name() -> str:
    index_file = STATIC_DIR / "index.html"
    if not index_file.is_file():
        return "missing"
    content = index_file.read_text(encoding="utf-8")
    marker = 'src="/assets/index-'
    start = content.find(marker)
    if start == -1:
        return "unknown"
    end = content.find('.js"', start)
    if end == -1:
        return "unknown"
    return content[start + len('src="/assets/'):end + 3]


@app.get("/api/auth/status")
def auth_status() -> dict[str, bool]:
    return {"auth_enabled": auth_enabled()}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not auth_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on this server.",
        )

    user = authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return LoginResponse(token=create_access_token(user.email), email=user.email)


@app.post("/api/preview", response_model=PreviewResponse)
async def preview(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    _: str = Depends(require_auth),
) -> PreviewResponse:
    content = await file.read()
    return preview_file(content, file.filename or "upload.xlsx", sheet_name)


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    column_mapping: str | None = Form(default=None),
    _: str = Depends(require_auth),
) -> AnalysisResult:
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    mapping_override = None
    if column_mapping:
        mapping_override = ColumnMapping(**json.loads(column_mapping))

    try:
        return analyze_file(
            content,
            file.filename or "upload.xlsx",
            sheet_name,
            mapping_override,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unable to process this file. Try uploading the original Excel workbook "
                "(.xlsx), or re-save CSV as UTF-8 comma-separated."
            ),
        ) from exc


@app.get("/api/demo-analysis", response_model=AnalysisResult)
def demo_analysis() -> AnalysisResult:
    if not SAMPLE_DATA_FILE.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample compensation file is not available.",
        )

    content = SAMPLE_DATA_FILE.read_bytes()
    return analyze_file(content, SAMPLE_DATA_FILE.name)


if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str) -> FileResponse:
        requested = STATIC_DIR / full_path
        if full_path and requested.is_file():
            return FileResponse(requested)
        return FileResponse(STATIC_DIR / "index.html")
