from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

PERSISTENT_DATA_DIR = Path("/var/data/shiftworkshr")


def on_render() -> bool:
    return bool(os.getenv("RENDER", "").strip() or os.getenv("RENDER_GIT_COMMIT", "").strip())


def resolve_data_dir() -> Path:
    """Resolve writable app data directory.

    Priority:
    1. DATA_DIR env var (explicit override)
    2. Render persistent disk mount path when running on Render
    3. Local backend/data for development
    """
    configured = os.getenv("DATA_DIR", "").strip()
    if configured:
        path = Path(configured)
    elif on_render():
        path = PERSISTENT_DATA_DIR
    else:
        path = Path(__file__).resolve().parent.parent / "data"

    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        logger.warning("Could not create data directory %s: %s", path, exc)
    return path


def data_dir_status() -> dict[str, object]:
    path = resolve_data_dir()
    writable = False
    try:
        probe = path / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        writable = True
    except OSError:
        writable = False

    configured = os.getenv("DATA_DIR", "").strip()
    using_persistent_disk = str(path) == str(PERSISTENT_DATA_DIR) and writable
    warning = None
    if on_render() and not using_persistent_disk:
        warning = (
            f"DATA_DIR is {path}; set DATA_DIR={PERSISTENT_DATA_DIR} in Render and attach a "
            "persistent disk mounted at that path so saved history and Stripe provisioning "
            "survive redeploys."
        )
    elif on_render() and using_persistent_disk and not configured:
        logger.info("Using Render persistent data path %s (DATA_DIR env not set).", path)

    return {
        "path": str(path),
        "writable": writable,
        "using_persistent_disk": using_persistent_disk,
        "configured_via_env": bool(configured),
        "warning": warning,
    }
