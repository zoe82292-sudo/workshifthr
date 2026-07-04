from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, Field

from app.data_paths import resolve_data_dir

logger = logging.getLogger(__name__)


class AnalyticsEvent(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    properties: dict[str, str | int | float | bool] = Field(default_factory=dict)


def record_event(event: AnalyticsEvent) -> None:
    path = resolve_data_dir() / "analytics_events.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "name": event.name,
        "properties": event.properties,
        "recorded_at": datetime.now(UTC).isoformat(),
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload) + "\n")
    logger.info("Analytics event: %s", event.name)
