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
    AccountInfoResponse,
    AuthContext,
    LoginRequest,
    LoginResponse,
    RecoverAccessRequest,
    RecoverAccessResponse,
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
    BillingPortalResponse,
    BillingStatusResponse,
    CheckoutRequest,
    CheckoutResponse,
    CheckoutSessionResponse,
    billing_enabled,
    billing_missing_config,
    create_billing_portal_session,
    create_checkout_session,
    get_checkout_session,
    handle_stripe_webhook,
)
from app.models import AnalysisOptions, AnalysisResult, BatchPreviewItem, BatchPreviewResponse, ColumnMapping, FileUploadSpec, PreviewResponse
from app.file_merge import MAX_MERGE_FILES, analyze_merged_files
from app.saved_mappings import get_saved_mapping, save_saved_mapping
from app.rate_limit import enforce_rate_limit
from app.uploads import max_upload_bytes, read_upload_bytes
from app.email_delivery import email_delivery_configured, send_credentials_email
from app.login_activity import has_logged_in_before, record_login
from app.org_members import (
    AddOrgMemberRequest,
    AddOrgMemberResponse,
    OrgMembersResponse,
    add_org_member,
    org_members_for_user,
    remove_org_member,
)
from app.analytics import AnalyticsEvent, record_event
from app.provisioning import reset_password_for_email
from pydantic import BaseModel, Field

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
    sentry_dsn = os.getenv("SENTRY_DSN", "").strip()
    if sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=sentry_dsn, traces_sample_rate=0.1)
            logger.info("Sentry error monitoring enabled.")
        except ImportError:
            logger.warning("SENTRY_DSN is set but sentry-sdk is not installed.")
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
    if os.getenv("PUBLIC_APP_URL", "").startswith("https://"):
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
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
                detail="Your plan has expired. Renew at https://shiftworkshr.com/#pricing or use Recover access if you still have team authorization.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    record_login(user.email)

    return LoginResponse(
        token=create_access_token(user.email, user.organization),
        email=user.email,
        organization=user.organization,
    )


@app.get("/api/auth/me", response_model=AccountInfoResponse)
def auth_me(user: AuthContext = Depends(require_auth_user)) -> AccountInfoResponse:
    from app.provisioning import account_info_for_email

    if user.email == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required.")

    account = account_info_for_email(user.email)
    return AccountInfoResponse(
        email=user.email,
        organization=user.organization,
        plan_id=account["plan_id"],
        plan_name=account["plan_name"],
        expires_at=account["expires_at"],
    )


RECOVER_ACCESS_MESSAGE = (
    "If this work email is authorized for your organization, we sent your login details."
)


@app.post("/api/auth/recover-access", response_model=RecoverAccessResponse)
def recover_access(payload: RecoverAccessRequest) -> RecoverAccessResponse:
    if not auth_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on this server.",
        )

    from app.provisioning import find_org_for_authorized_email

    email = payload.email.strip().lower()
    is_provisioned = find_org_for_authorized_email(email) is not None
    if is_provisioned or has_logged_in_before(email):
        reset = reset_password_for_email(email)
        if reset is not None and email_delivery_configured():
            send_credentials_email(
                organization=reset["organization"],
                email=reset["email"],
                password=reset["password"],
                plan_id=reset.get("plan_id", ""),
                recovery=True,
            )

    return RecoverAccessResponse(message=RECOVER_ACCESS_MESSAGE)


@app.get("/api/org/members", response_model=OrgMembersResponse)
def org_members(user: AuthContext = Depends(require_auth_user)) -> OrgMembersResponse:
    if user.email == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required.")

    payload = org_members_for_user(user.email)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team management is available for provisioned organization accounts.",
        )
    return payload


@app.post("/api/org/members", response_model=AddOrgMemberResponse)
def org_members_add(
    payload: AddOrgMemberRequest,
    user: AuthContext = Depends(require_auth_user),
) -> AddOrgMemberResponse:
    if user.email == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required.")

    try:
        return add_org_member(user.email, str(payload.email))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.delete("/api/org/members/{member_email}")
def org_members_remove(
    member_email: str,
    user: AuthContext = Depends(require_auth_user),
) -> dict[str, list[str]]:
    if user.email == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required.")

    try:
        members = remove_org_member(user.email, member_email)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"members": members}


class SavedMappingResponse(BaseModel):
    mapping: ColumnMapping | None = None


@app.get("/api/org/column-mapping", response_model=SavedMappingResponse)
def org_column_mapping_get(user: AuthContext = Depends(require_auth_user)) -> SavedMappingResponse:
    if user.email == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required.")
    if not user.organization:
        return SavedMappingResponse(mapping=None)
    return SavedMappingResponse(mapping=get_saved_mapping(user.organization, user.email))


@app.put("/api/org/column-mapping", response_model=SavedMappingResponse)
def org_column_mapping_save(
    payload: ColumnMapping,
    user: AuthContext = Depends(require_auth_user),
) -> SavedMappingResponse:
    if user.email == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required.")
    if not user.organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column mapping save is available for provisioned organization accounts.",
        )
    saved = save_saved_mapping(user.organization, user.email, payload)
    return SavedMappingResponse(mapping=saved)


class AnalyticsEventRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    properties: dict[str, str | int | float | bool] = Field(default_factory=dict)


@app.post("/api/analytics/event")
def analytics_event(payload: AnalyticsEventRequest) -> dict[str, bool]:
    record_event(AnalyticsEvent(name=payload.name, properties=payload.properties))
    return {"ok": True}


@app.get("/api/billing/status", response_model=BillingStatusResponse)
def billing_status() -> BillingStatusResponse:
    from app.billing import billing_status_response

    return billing_status_response()


@app.post("/api/billing/checkout", response_model=CheckoutResponse)
def billing_checkout(payload: CheckoutRequest) -> CheckoutResponse:
    return create_checkout_session(payload)


@app.post("/api/billing/portal", response_model=BillingPortalResponse)
def billing_portal(user: AuthContext = Depends(require_auth_user)) -> BillingPortalResponse:
    if user.email == "anonymous":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required.")
    return create_billing_portal_session(user.email)


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


@app.post("/api/preview-batch", response_model=BatchPreviewResponse)
async def preview_batch(
    files: list[UploadFile] = File(...),
    _: str = Depends(require_auth),
) -> BatchPreviewResponse:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload at least one file.",
        )
    if len(files) > MAX_MERGE_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can upload up to {MAX_MERGE_FILES} files at a time.",
        )

    items: list[BatchPreviewItem] = []
    for upload in files:
        content = await read_upload_bytes(upload)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{upload.filename or 'Upload'} is empty.",
            )
        try:
            preview = preview_file(content, upload.filename or "upload.xlsx")
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        items.append(
            BatchPreviewItem(
                filename=upload.filename or "upload.xlsx",
                preview=preview,
            )
        )
    return BatchPreviewResponse(files=items)


@app.post("/api/analyze-batch", response_model=AnalysisResult)
async def analyze_batch(
    files: list[UploadFile] = File(...),
    file_specs: str = Form(...),
    merit_iqr_multiplier: float | None = Form(default=None),
    _: str = Depends(require_auth),
) -> AnalysisResult:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload at least one file.",
        )
    if len(files) > MAX_MERGE_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can merge up to {MAX_MERGE_FILES} files at a time.",
        )

    try:
        specs = [FileUploadSpec.model_validate(item) for item in json.loads(file_specs)]
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file mapping payload.",
        ) from exc

    if len(specs) != len(files):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Each uploaded file needs a column mapping entry.",
        )

    sources: list[tuple[bytes, str, str | None, ColumnMapping]] = []
    for upload, spec in zip(files, specs, strict=True):
        content = await read_upload_bytes(upload)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{upload.filename or 'Upload'} is empty.",
            )
        filename = upload.filename or spec.filename
        sources.append((content, filename, spec.sheet_name, spec.column_mapping))

    try:
        options = AnalysisOptions(
            merit_iqr_multiplier=merit_iqr_multiplier
            if merit_iqr_multiplier is not None
            else 1.5,
        )
        return analyze_merged_files(sources, options)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected analyze-batch failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to merge and analyze these files. Check Employee ID mappings and try again.",
        ) from exc


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    column_mapping: str | None = Form(default=None),
    merit_iqr_multiplier: float | None = Form(default=None),
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
        options = AnalysisOptions(
            merit_iqr_multiplier=merit_iqr_multiplier
            if merit_iqr_multiplier is not None
            else 1.5,
        )
        return analyze_file(
            content,
            file.filename or "upload.xlsx",
            sheet_name,
            mapping_override,
            options,
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
