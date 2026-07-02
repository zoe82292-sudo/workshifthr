from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.analyzer import analyze_file, preview_file
from app.auth import (
    AuthContext,
    LoginRequest,
    LoginResponse,
    auth_enabled,
    authenticate_user,
    create_access_token,
    require_auth,
    require_auth_user,
)
from app.analysis_history import (
    AnalysisHistoryDetail,
    AnalysisHistorySummary,
    SaveAnalysisRequest,
    delete_history,
    get_history,
    list_history,
    save_history,
)
from app.billing import (
    BillingStatusResponse,
    CheckoutRequest,
    CheckoutResponse,
    CheckoutSessionResponse,
    billing_enabled,
    billing_missing_config,
    create_checkout_session,
    get_checkout_session,
    handle_stripe_webhook,
)
from app.models import AnalysisResult, ColumnMapping, PreviewResponse
from app.rate_limit import enforce_rate_limit
from app.uploads import max_upload_bytes, read_upload_bytes
from app.email_delivery import email_delivery_configured

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = ROOT_DIR / "frontend" / "dist"
SAMPLE_DATA_FILE = ROOT_DIR / "sample-data" / "compensation-sample.csv"
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

@asynccontextmanager
async def lifespan(_: FastAPI):
    if auth_enabled() and not os.getenv("JWT_SECRET", "").strip():
        raise RuntimeError(
            "JWT_SECRET is required when authentication is enabled. "
            "Set JWT_SECRET in your environment before starting the server."
        )
    status = data_dir_status()
    logger.info("ShiftWorksHR data directory: %s", status)
    if status.get("warning"):
        logger.warning("%s", status["warning"])
    if not email_delivery_configured():
        logger.warning(
            "Credential email is not configured — set RESEND_API_KEY or SMTP_HOST/SMTP_FROM "
            "so customers receive login details after checkout."
        )
    yield


app = FastAPI(title="ShiftWorksHR Compensation Analyzer", lifespan=lifespan)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        enforce_rate_limit(request)
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.data_paths import data_dir_status, resolve_data_dir


@app.get("/api/health")
def health() -> dict[str, object]:
    favicon_path = STATIC_DIR / "favicon.ico"
    index_file = STATIC_DIR / "index.html"
    index_text = index_file.read_text(encoding="utf-8") if index_file.is_file() else ""
    return {
        "status": "ok",
        "auth_enabled": auth_enabled(),
        "billing_enabled": billing_enabled(),
        "billing_missing": billing_missing_config() if not billing_enabled() else [],
        "max_upload_mb": max_upload_bytes() // (1024 * 1024),
        "data_dir": data_dir_status(),
        "credential_email_configured": email_delivery_configured(),
        "git_commit": os.getenv("RENDER_GIT_COMMIT", "local"),
        "frontend_bundle": _frontend_bundle_name(),
        "favicon_ico_exists": favicon_path.is_file(),
        "favicon_index_version": (
            "v5" if "favicon.ico?v=5" in index_text else "v4" if "favicon.ico?v=4" in index_text else "legacy"
        ),
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
        from app.provisioning import org_access_expired

        if org_access_expired(payload.email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your plan has expired. Renew at shiftworkshr.com/#pricing or email hello@shiftworkshr.com.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return LoginResponse(
        token=create_access_token(user.email, user.organization),
        email=user.email,
        organization=user.organization,
    )


@app.get("/api/billing/status", response_model=BillingStatusResponse)
def billing_status() -> BillingStatusResponse:
    from app.billing import billing_status_response

    return billing_status_response()


@app.post("/api/billing/checkout", response_model=CheckoutResponse)
def billing_checkout(payload: CheckoutRequest) -> CheckoutResponse:
    return create_checkout_session(payload.plan_id)


@app.get("/api/billing/session/{session_id}", response_model=CheckoutSessionResponse)
def billing_session(session_id: str) -> CheckoutSessionResponse:
    session = get_checkout_session(session_id)
    if session.status not in {"complete", "paid"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This checkout session is not complete yet.",
        )
    return session


@app.post("/api/billing/webhook")
async def billing_webhook(request: Request) -> dict[str, bool]:
    return await handle_stripe_webhook(request)


@app.get("/api/sample-template")
def sample_template() -> FileResponse:
    if not SAMPLE_DATA_FILE.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample template is not available.",
        )
    return FileResponse(
        SAMPLE_DATA_FILE,
        media_type="text/csv",
        filename="shiftworkshr-compensation-template.csv",
    )


@app.post("/api/preview", response_model=PreviewResponse)
async def preview(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    _: str = Depends(require_auth),
) -> PreviewResponse:
    content = await read_upload_bytes(file)
    return preview_file(content, file.filename or "upload.xlsx", sheet_name)


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    column_mapping: str | None = Form(default=None),
    _: str = Depends(require_auth),
) -> AnalysisResult:
    content = await read_upload_bytes(file)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    mapping_override = None
    if column_mapping:
        try:
            mapping_override = ColumnMapping(**json.loads(column_mapping))
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid column mapping payload.",
            ) from exc

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
        logger.exception("Unexpected analyze failure for %s", file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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


@app.get("/api/analysis/history", response_model=list[AnalysisHistorySummary])
def analysis_history_list(user: AuthContext = Depends(require_auth_user)) -> list[AnalysisHistorySummary]:
    if user.email == "anonymous":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to view saved analyses.",
        )
    return list_history(user.organization, user.email)


@app.post("/api/analysis/history", response_model=AnalysisHistorySummary)
def analysis_history_save(
    payload: SaveAnalysisRequest,
    user: AuthContext = Depends(require_auth_user),
) -> AnalysisHistorySummary:
    if user.email == "anonymous":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to save analyses.",
        )
    return save_history(user.organization, user.email, payload.file_name, payload.result)


@app.get("/api/analysis/history/{history_id}", response_model=AnalysisHistoryDetail)
def analysis_history_get(
    history_id: str,
    user: AuthContext = Depends(require_auth_user),
) -> AnalysisHistoryDetail:
    if user.email == "anonymous":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to view saved analyses.",
        )
    record = get_history(user.organization, user.email, history_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved analysis not found.")
    return record


@app.delete("/api/analysis/history/{history_id}")
def analysis_history_delete(
    history_id: str,
    user: AuthContext = Depends(require_auth_user),
) -> dict[str, bool]:
    if user.email == "anonymous":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to manage saved analyses.",
        )
    deleted = delete_history(user.organization, user.email, history_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved analysis not found.")
    return {"deleted": True}


if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    _ICON_FILES: dict[str, str] = {
        "favicon.ico": "image/x-icon",
        "favicon.svg": "image/svg+xml",
        "favicon-32.png": "image/png",
        "apple-touch-icon.png": "image/png",
        "logo.png": "image/png",
        "og-image.png": "image/png",
    }

    for icon_name, media_type in _ICON_FILES.items():

        def _make_icon_handler(name: str = icon_name, mime: str = media_type):
            async def _handler() -> FileResponse:
                icon_path = STATIC_DIR / name
                if not icon_path.is_file():
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
                return FileResponse(icon_path, media_type=mime, headers={"Cache-Control": "public, max-age=86400"})

            return _handler

        app.get(f"/{icon_name}")(_make_icon_handler())

    _STATIC_EXTENSIONS = {".ico", ".png", ".svg", ".jpg", ".jpeg", ".webp", ".woff", ".woff2"}

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str) -> FileResponse:
        requested = STATIC_DIR / full_path
        if full_path and requested.is_file():
            return FileResponse(requested)
        if full_path and Path(full_path).suffix.lower() in _STATIC_EXTENSIONS:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        return FileResponse(STATIC_DIR / "index.html")
