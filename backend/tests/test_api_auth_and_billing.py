from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.auth import invalidate_credentials_cache


@pytest.fixture()
def auth_client(monkeypatch) -> TestClient:
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-at-least-32-characters-long")
    monkeypatch.setenv(
        "AUTH_USERS",
        json.dumps(
            [
                {
                    "organization": "Acme Corp",
                    "password": "SharedPass123!",
                    "emails": ["analyst@acme.com"],
                    "allow_domain": "acme.com",
                }
            ]
        ),
    )
    invalidate_credentials_cache()
    from app.main import app

    return TestClient(app)


def test_health_reports_writable_data_dir(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["data_dir"]["writable"] is True
    assert payload["data_dir"]["using_persistent_disk"] is False
    assert payload["data_dir"]["warning"] is None
    assert payload["max_upload_mb"] == 25


def test_health_warns_when_render_without_persistent_disk(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "ephemeral"))
    monkeypatch.setenv("RENDER", "true")
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["data_dir"]["using_persistent_disk"] is False
    assert payload["data_dir"]["warning"] is not None
    assert "/var/data/shiftworkshr" in payload["data_dir"]["warning"]


def test_auth_status_without_users(monkeypatch) -> None:
    monkeypatch.delenv("AUTH_USERS", raising=False)
    invalidate_credentials_cache()
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    assert response.json()["auth_enabled"] is False


def test_login_success_and_rejects_bad_password(auth_client: TestClient) -> None:
    ok = auth_client.post(
        "/api/auth/login",
        json={"email": "analyst@acme.com", "password": "SharedPass123!"},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["email"] == "analyst@acme.com"
    assert body["organization"] == "Acme Corp"
    assert body["token"]

    bad = auth_client.post(
        "/api/auth/login",
        json={"email": "analyst@acme.com", "password": "wrong-password"},
    )
    assert bad.status_code == 401


def test_domain_login_uses_shared_password(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/auth/login",
        json={"email": "peer@acme.com", "password": "SharedPass123!"},
    )
    assert response.status_code == 200
    assert response.json()["organization"] == "Acme Corp"


def test_analyze_requires_auth_when_enabled(auth_client: TestClient) -> None:
    response = auth_client.post("/api/analyze")
    assert response.status_code == 401


def test_billing_status_when_stripe_not_configured(auth_client: TestClient) -> None:
    response = auth_client.get("/api/billing/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is False
    assert "STRIPE_SECRET_KEY" in payload["missing"]


def test_billing_webhook_requires_signature(auth_client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")
    response = auth_client.post("/api/billing/webhook", content=b"{}")
    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower()


def test_demo_analysis_is_public(auth_client: TestClient) -> None:
    response = auth_client.get("/api/demo-analysis")
    assert response.status_code == 200
    assert response.json()["summary"]["total_rows"] > 0
