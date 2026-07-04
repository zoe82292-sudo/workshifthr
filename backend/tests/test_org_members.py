from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.auth import invalidate_credentials_cache
from app.provisioning import _write_store


@pytest.fixture()
def provisioned_client(monkeypatch, tmp_path) -> TestClient:
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-at-least-32-characters-long")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.delenv("AUTH_USERS", raising=False)
    _write_store(
        {
            "orgs": [
                {
                    "stripe_session_id": "cs_test_123",
                    "organization": "Acme Corp",
                    "company_domain": "acme.com",
                    "authorized_emails": ["buyer@acme.com"],
                    "password_hash": "$2b$12$placeholder",
                    "initial_password": None,
                    "plan_id": "cycle",
                    "created_at": "2026-01-01T00:00:00+00:00",
                    "expires_at": "2027-01-01T00:00:00+00:00",
                }
            ]
        }
    )
    invalidate_credentials_cache()

    from app.auth import _hash_password
    from app.provisioning import _read_store

    store = _read_store()
    store["orgs"][0]["password_hash"] = _hash_password("SharedPass123!").decode("utf-8")
    _write_store(store)
    invalidate_credentials_cache()

    from app.main import app

    return TestClient(app)


def test_org_members_add_and_remove(provisioned_client: TestClient) -> None:
    login = provisioned_client.post(
        "/api/auth/login",
        json={"email": "buyer@acme.com", "password": "SharedPass123!"},
    )
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    listed = provisioned_client.get("/api/org/members", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["members"][0]["email"] == "buyer@acme.com"

    with patch("app.email_delivery.send_teammate_invite_email", return_value=True):
        added = provisioned_client.post(
            "/api/org/members",
            headers=headers,
            json={"email": "hr@acme.com"},
        )
    assert added.status_code == 200
    assert "hr@acme.com" in added.json()["members"]

    removed = provisioned_client.delete("/api/org/members/hr@acme.com", headers=headers)
    assert removed.status_code == 200
    assert removed.json()["members"] == ["buyer@acme.com"]


def test_org_members_reject_wrong_domain(provisioned_client: TestClient) -> None:
    login = provisioned_client.post(
        "/api/auth/login",
        json={"email": "buyer@acme.com", "password": "SharedPass123!"},
    )
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = provisioned_client.post(
        "/api/org/members",
        headers=headers,
        json={"email": "other@example.com"},
    )
    assert response.status_code == 400
    assert "organization domain" in response.json()["detail"].lower()


def test_generate_password_is_strong() -> None:
    from app.provisioning import _generate_password

    password = _generate_password()
    assert len(password) == 16
    assert any(char.islower() for char in password)
    assert any(char.isupper() for char in password)
    assert any(char.isdigit() for char in password)
