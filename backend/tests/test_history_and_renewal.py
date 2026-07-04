from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.analysis_history import get_history, list_history, org_storage_key, save_history
from app.models import AnalysisResult
from app.provisioning import _plan_expires_at, renew_org_access, revoke_org_access


def test_org_storage_key_is_stable() -> None:
    first = org_storage_key("Acme Corp", "hr@acme.com")
    second = org_storage_key("Acme Corp", "hr@acme.com")
    peer = org_storage_key("Acme Corp", "peer@acme.com")
    assert first == second
    assert first == peer
    assert first.startswith("acme-corp-")


def test_save_and_load_analysis_history(sample_analysis_result: AnalysisResult) -> None:
    summary = save_history("Acme Corp", "analyst@acme.com", "cycle-file.csv", sample_analysis_result)
    assert summary.file_name == "cycle-file.csv"
    assert summary.total_rows == sample_analysis_result.summary.total_rows

    items = list_history("Acme Corp", "analyst@acme.com")
    assert len(items) == 1

    loaded = get_history("Acme Corp", "analyst@acme.com", summary.id)
    assert loaded is not None
    assert loaded.result.summary.total_rows == sample_analysis_result.summary.total_rows


def test_history_is_shared_across_org_members(sample_analysis_result: AnalysisResult) -> None:
    first = save_history("Acme Corp", "analyst@acme.com", "first.csv", sample_analysis_result)
    second = save_history("Acme Corp", "peer@acme.com", "second.csv", sample_analysis_result)

    analyst_items = list_history("Acme Corp", "analyst@acme.com")
    peer_items = list_history("Acme Corp", "peer@acme.com")

    assert len(analyst_items) == 2
    assert len(peer_items) == 2
    assert {item.id for item in analyst_items} == {first.id, second.id}
    assert get_history("Acme Corp", "peer@acme.com", first.id) is not None
    assert get_history("Acme Corp", "analyst@acme.com", second.id) is not None


def test_renew_org_access_extends_monthly_plan(tmp_path, monkeypatch) -> None:
    store_file = tmp_path / "provisioned_orgs.json"
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    expired = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    store_file.write_text(
        """
{
  "orgs": [
    {
      "stripe_session_id": "cs_test",
      "organization": "Renewal Co",
      "company_domain": "renewalco.com",
      "authorized_emails": ["owner@renewalco.com"],
      "password_hash": "x",
      "initial_password": "test",
      "plan_id": "monthly",
      "created_at": "2025-01-01T00:00:00+00:00",
      "expires_at": "%s",
      "stripe_customer_id": "cus_test",
      "stripe_subscription_id": "sub_test"
    }
  ]
}
"""
        % expired,
        encoding="utf-8",
    )

    renewed = renew_org_access(stripe_customer_id="cus_test", plan_id="monthly")
    assert renewed is True

    from app.provisioning import org_access_expired

    assert org_access_expired("owner@renewalco.com") is False


def test_revoke_org_access(tmp_path, monkeypatch) -> None:
    store_file = tmp_path / "provisioned_orgs.json"
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    future = (datetime.now(UTC) + timedelta(days=30)).isoformat()
    store_file.write_text(
        """
{
  "orgs": [
    {
      "stripe_session_id": "cs_revoke",
      "organization": "Revoke Co",
      "company_domain": "revokeco.com",
      "authorized_emails": ["owner@revokeco.com"],
      "password_hash": "x",
      "plan_id": "monthly",
      "created_at": "2025-01-01T00:00:00+00:00",
      "expires_at": "%s",
      "stripe_customer_id": "cus_revoke",
      "stripe_subscription_id": "sub_revoke"
    }
  ]
}
"""
        % future,
        encoding="utf-8",
    )

    from app.provisioning import org_access_expired, revoke_org_access

    assert org_access_expired("owner@revokeco.com") is False
    assert revoke_org_access(stripe_customer_id="cus_revoke") is True
    assert org_access_expired("owner@revokeco.com") is True


def test_plan_expires_at_uses_duration() -> None:
    start = datetime(2025, 1, 1, tzinfo=UTC).isoformat()
    monthly = _plan_expires_at("monthly", start)
    annual = _plan_expires_at("annual", start)
    assert "2025-02" in monthly
    assert "2026-01" in annual
