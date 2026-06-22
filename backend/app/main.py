from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.analyzer import analyze_file, preview_file
from app.models import AnalysisResult, ColumnMapping, PreviewResponse

ROOT_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = ROOT_DIR / "frontend" / "dist"
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app = FastAPI(title="WorkShiftHR Compensation Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/preview", response_model=PreviewResponse)
async def preview(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
) -> PreviewResponse:
    content = await file.read()
    return preview_file(content, file.filename or "upload.xlsx", sheet_name)


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    column_mapping: str | None = Form(default=None),
) -> AnalysisResult:
    content = await file.read()
    mapping_override = None
    if column_mapping:
        mapping_override = ColumnMapping(**json.loads(column_mapping))
    return analyze_file(content, file.filename or "upload.xlsx", sheet_name, mapping_override)


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
