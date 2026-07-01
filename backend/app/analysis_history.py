from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from app.models import AnalysisResult

logger = logging.getLogger(__name__)

_file_lock = threading.Lock()


class AnalysisHistorySummary(BaseModel):
    id: str
    file_name: str
    saved_at: str
    saved_by: str
    total_rows: int
    below_minimum: int
    risk_level: str


class SaveAnalysisRequest(BaseModel):
    file_name: str
    result: AnalysisResult


class AnalysisHistoryDetail(AnalysisHistorySummary):
    result: AnalysisResult


def _data_dir() -> Path:
    configured = os.getenv("DATA_DIR", "").strip()
    if configured:
        path = Path(configured)
    else:
        path = Path(__file__).resolve().parent.parent / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _max_per_org() -> int:
    raw = os.getenv("ANALYSIS_HISTORY_MAX_PER_ORG", "25").strip()
    try:
        return max(1, int(raw))
    except ValueError:
        return 25


def org_storage_key(organization: str, email: str) -> str:
    """Per-user storage namespace within an organization."""
    slug = re.sub(r"[^\w\-]+", "-", organization.lower()).strip("-") or "org"
    normalized_email = email.strip().lower()
    digest = hashlib.sha256(f"{organization}:{normalized_email}".encode()).hexdigest()[:12]
    return f"{slug}-{digest}"


def _org_dir(storage_key: str) -> Path:
    path = _data_dir() / "analysis_history" / storage_key
    path.mkdir(parents=True, exist_ok=True)
    return path


def _summary_from_record(record: dict[str, Any]) -> AnalysisHistorySummary:
    result = record.get("result", {})
    summary = result.get("summary", {})
    insights = result.get("insights", {})
    executive = insights.get("executive_summary", {})
    return AnalysisHistorySummary(
        id=str(record["id"]),
        file_name=str(record.get("file_name", "analysis")),
        saved_at=str(record.get("saved_at", "")),
        saved_by=str(record.get("saved_by", "")),
        total_rows=int(summary.get("total_rows", 0)),
        below_minimum=int(summary.get("below_minimum", 0)),
        risk_level=str(executive.get("risk_level", "unknown")),
    )


def list_history(organization: str, email: str) -> list[AnalysisHistorySummary]:
    org_dir = _org_dir(org_storage_key(organization, email))
    summaries: list[AnalysisHistorySummary] = []
    with _file_lock:
        for path in sorted(org_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True):
            try:
                record = json.loads(path.read_text(encoding="utf-8"))
                summaries.append(_summary_from_record(record))
            except (json.JSONDecodeError, KeyError, TypeError):
                logger.warning("Skipping corrupt analysis history file %s", path)
    return summaries


def save_history(
    organization: str,
    email: str,
    file_name: str,
    result: AnalysisResult,
) -> AnalysisHistorySummary:
    storage_key = org_storage_key(organization, email)
    org_dir = _org_dir(storage_key)
    record_id = uuid.uuid4().hex
    saved_at = datetime.now(UTC).isoformat()
    record = {
        "id": record_id,
        "file_name": file_name,
        "saved_at": saved_at,
        "saved_by": email,
        "organization": organization,
        "result": result.model_dump(),
    }

    with _file_lock:
        target = org_dir / f"{record_id}.json"
        tmp = target.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        tmp.replace(target)
        _enforce_retention(org_dir)

    return _summary_from_record(record)


def get_history(organization: str, email: str, history_id: str) -> AnalysisHistoryDetail | None:
    path = _org_dir(org_storage_key(organization, email)) / f"{history_id}.json"
    if not path.is_file():
        return None
    with _file_lock:
        record = json.loads(path.read_text(encoding="utf-8"))
    summary = _summary_from_record(record)
    return AnalysisHistoryDetail(
        **summary.model_dump(),
        result=AnalysisResult.model_validate(record["result"]),
    )


def delete_history(organization: str, email: str, history_id: str) -> bool:
    path = _org_dir(org_storage_key(organization, email)) / f"{history_id}.json"
    with _file_lock:
        if not path.is_file():
            return False
        path.unlink()
    return True


def _enforce_retention(org_dir: Path) -> None:
    files = sorted(org_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    for stale in files[_max_per_org() :]:
        stale.unlink(missing_ok=True)
