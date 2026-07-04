from __future__ import annotations

import json
import logging
import threading
from pathlib import Path

from app.analysis_history import org_storage_key
from app.data_paths import resolve_data_dir
from app.models import ColumnMapping

logger = logging.getLogger(__name__)
_file_lock = threading.Lock()


def _mapping_path(organization: str, email: str) -> Path:
    storage_key = org_storage_key(organization, email)
    directory = resolve_data_dir() / "saved_mappings"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f"{storage_key}.json"


def get_saved_mapping(organization: str, email: str) -> ColumnMapping | None:
    path = _mapping_path(organization, email)
    if not path.is_file():
        return None
    with _file_lock:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.warning("Skipping corrupt saved mapping file %s", path)
            return None
    try:
        return ColumnMapping.model_validate(payload.get("mapping", payload))
    except Exception:
        logger.warning("Invalid saved mapping payload in %s", path)
        return None


def save_saved_mapping(organization: str, email: str, mapping: ColumnMapping) -> ColumnMapping:
    path = _mapping_path(organization, email)
    record = {
        "organization": organization,
        "saved_by": email,
        "mapping": mapping.model_dump(),
    }
    with _file_lock:
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        tmp.replace(path)
    return mapping
