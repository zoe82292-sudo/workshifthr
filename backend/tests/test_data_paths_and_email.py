from __future__ import annotations

from unittest.mock import patch

from app.data_paths import PERSISTENT_DATA_DIR, resolve_data_dir
from app.email_delivery import email_delivery_configured, send_credentials_email


def test_resolve_data_dir_uses_env(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "custom"))
    monkeypatch.delenv("RENDER", raising=False)
    assert resolve_data_dir() == tmp_path / "custom"


def test_resolve_data_dir_defaults_to_render_mount(monkeypatch, tmp_path) -> None:
    mount = tmp_path / "shiftworkshr"
    monkeypatch.delenv("DATA_DIR", raising=False)
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setattr("app.data_paths.PERSISTENT_DATA_DIR", mount)
    path = resolve_data_dir()
    assert path == mount


def test_email_delivery_requires_config(monkeypatch) -> None:
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("SMTP_HOST", raising=False)
    assert email_delivery_configured() is False


def test_send_credentials_email_via_resend(monkeypatch) -> None:
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("SMTP_FROM", "ShiftWorksHR <hello@shiftworkshr.com>")

    with patch("app.email_delivery._send_via_resend", return_value=True) as send:
        ok = send_credentials_email(
            organization="Acme Corp",
            email="hr@acme.com",
            password="Shift-test123",
            plan_id="cycle",
        )

    assert ok is True
    send.assert_called_once()
