from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import invalidate_credentials_cache

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_FILE = ROOT / "sample-data" / "compensation-sample.csv"


@pytest.fixture()
def trial_client(monkeypatch) -> TestClient:
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-at-least-32-characters-long")
    monkeypatch.setenv(
        "AUTH_USERS",
        json.dumps(
            [
                {
                    "organization": "Acme Corp",
                    "password": "SharedPass123!",
                    "emails": ["analyst@acme.com"],
                }
            ]
        ),
    )
    monkeypatch.setenv("TRIAL_ENABLED", "true")
    monkeypatch.setenv("TRIAL_MAX_ROWS", "500")
    invalidate_credentials_cache()
    from app.main import app

    return TestClient(app)


def test_auth_status_includes_trial(trial_client: TestClient) -> None:
    response = trial_client.get("/api/auth/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["auth_enabled"] is True
    assert payload["trial_enabled"] is True
    assert payload["trial_max_rows"] == 250


def test_trial_preview_without_auth(trial_client: TestClient) -> None:
    with SAMPLE_FILE.open("rb") as handle:
        response = trial_client.post(
            "/api/preview",
            files={"file": ("compensation-sample.csv", handle, "text/csv")},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rows"] > 0


def test_trial_analyze_without_auth(trial_client: TestClient) -> None:
    with SAMPLE_FILE.open("rb") as handle:
        response = trial_client.post(
            "/api/analyze",
            files={"file": ("compensation-sample.csv", handle, "text/csv")},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["trial_mode"] is True
    assert payload["summary"]["total_rows"] > 0


def test_trial_rejects_batch_preview(trial_client: TestClient) -> None:
    with SAMPLE_FILE.open("rb") as handle:
        response = trial_client.post(
            "/api/preview-batch",
            files=[("files", ("a.csv", handle.read(), "text/csv")), ("files", ("b.csv", b"id\n1\n", "text/csv"))],
        )
    assert response.status_code == 400
    assert "Free trial supports" in response.json()["detail"]
