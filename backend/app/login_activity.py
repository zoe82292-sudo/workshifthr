from __future__ import annotations

import json
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.data_paths import resolve_data_dir

_file_lock = threading.Lock()


def _store_path() -> Path:
    return resolve_data_dir() / "login_activity.json"


def _read_store() -> dict[str, Any]:
    path = _store_path()
    if not path.exists():
        return {"users": {}}
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _write_store(data: dict[str, Any]) -> None:
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".json.tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    tmp_path.replace(path)


def record_login(email: str) -> None:
    normalized = email.strip().lower()
    if not normalized or "@" not in normalized:
        return

    now = datetime.now(UTC).isoformat()
    with _file_lock:
        store = _read_store()
        users = store.setdefault("users", {})
        existing = users.get(normalized, {})
        users[normalized] = {
            "last_login_at": now,
            "login_count": int(existing.get("login_count", 0)) + 1,
        }
        _write_store(store)


def has_logged_in_before(email: str) -> bool:
    normalized = email.strip().lower()
    with _file_lock:
        users = _read_store().get("users", {})
    return normalized in users
