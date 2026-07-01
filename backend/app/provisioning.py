from __future__ import annotations

import json
import logging
import os
import secrets
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import bcrypt

from app.auth import _OrgCredential, _hash_password, _organization_name

logger = logging.getLogger(__name__)

_file_lock = threading.Lock()
_store_mtime: float | None = None

PLAN_DURATION_DAYS: dict[str, int] = {
    "cycle": 90,
    "monthly": 31,
    "annual": 365,
}


def auto_provision_enabled() -> bool:
    return os.getenv("AUTH_AUTO_PROVISION", "true").strip().lower() not in {"false", "0", "no"}


def _store_path() -> Path:
    configured = os.getenv("DATA_DIR", "").strip()
    if configured:
        data_dir = Path(configured)
    else:
        data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "provisioned_orgs.json"


def store_mtime() -> float:
    path = _store_path()
    if not path.exists():
        return 0.0
    return path.stat().st_mtime


def has_orgs() -> bool:
    return bool(_read_store().get("orgs"))


def _read_store() -> dict[str, Any]:
    path = _store_path()
    if not path.exists():
        return {"orgs": []}
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _write_store(data: dict[str, Any]) -> None:
    global _store_mtime
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".json.tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    tmp_path.replace(path)
    _store_mtime = path.stat().st_mtime


def _company_domain(email: str) -> str:
    return email.split("@", 1)[1].lower()


def _generate_password() -> str:
    return f"Shift-{secrets.token_urlsafe(9)}"


def _normalize_org(raw: dict[str, Any]) -> dict[str, Any]:
    emails = [str(value).strip().lower() for value in raw.get("authorized_emails", []) if str(value).strip()]
    return {
        "stripe_session_id": str(raw.get("stripe_session_id", "")),
        "organization": str(raw.get("organization", "")),
        "company_domain": str(raw.get("company_domain", "")),
        "authorized_emails": list(dict.fromkeys(emails)),
        "password_hash": str(raw.get("password_hash", "")),
        "initial_password": raw.get("initial_password"),
        "plan_id": str(raw.get("plan_id", "")),
        "created_at": str(raw.get("created_at", "")),
        "expires_at": str(raw.get("expires_at", "")),
        "stripe_customer_id": str(raw.get("stripe_customer_id", "")),
        "stripe_subscription_id": str(raw.get("stripe_subscription_id", "")),
        "last_renewed_at": str(raw.get("last_renewed_at", "")),
    }


def _plan_expires_at(plan_id: str, created_at: str) -> str:
    days = PLAN_DURATION_DAYS.get(plan_id)
    if not days:
        return ""
    try:
        start = datetime.fromisoformat(created_at)
    except ValueError:
        start = datetime.now(UTC)
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)
    return (start + timedelta(days=days)).isoformat()


def _find_org_by_email(store: dict[str, Any], email: str) -> dict[str, Any] | None:
    normalized = email.strip().lower()
    for org in store.get("orgs", []):
        if normalized in org.get("authorized_emails", []):
            return org
        company_domain = str(org.get("company_domain", "")).lower()
        if company_domain and normalized.endswith(f"@{company_domain}"):
            return org
    return None


def _find_org_by_stripe(
    store: dict[str, Any],
    *,
    customer_id: str | None = None,
    subscription_id: str | None = None,
) -> dict[str, Any] | None:
    for org in store.get("orgs", []):
        if customer_id and org.get("stripe_customer_id") == customer_id:
            return org
        if subscription_id and org.get("stripe_subscription_id") == subscription_id:
            return org
    return None


def renew_org_access(
    *,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    plan_id: str | None = None,
) -> bool:
    """Extend subscription access after a successful renewal payment."""
    with _file_lock:
        store = _read_store()
        org = _find_org_by_stripe(
            store,
            customer_id=stripe_customer_id,
            subscription_id=stripe_subscription_id,
        )
        if org is None:
            return False

        effective_plan = plan_id or str(org.get("plan_id") or "")
        if effective_plan not in {"monthly", "annual"}:
            logger.info("Skipping renewal for non-subscription plan %s", effective_plan)
            return False

        now = datetime.now(UTC).isoformat()
        org["expires_at"] = _plan_expires_at(effective_plan, now)
        org["last_renewed_at"] = now
        if plan_id:
            org["plan_id"] = plan_id
        if stripe_customer_id:
            org["stripe_customer_id"] = stripe_customer_id
        if stripe_subscription_id:
            org["stripe_subscription_id"] = stripe_subscription_id
        _write_store(store)
        org_name = org.get("organization")
        expires_at = org.get("expires_at")

    from app.auth import invalidate_credentials_cache

    invalidate_credentials_cache()
    logger.info(
        "Renewed org %s until %s (plan=%s)",
        org_name,
        expires_at,
        effective_plan,
    )
    return True


def org_access_expired(email: str) -> bool:
    normalized = email.strip().lower()
    with _file_lock:
        org = _find_org_by_email(_read_store(), normalized)
    if org is None:
        return False

    expires_at = str(org.get("expires_at") or "")
    if not expires_at:
        return False

    try:
        expiry = datetime.fromisoformat(expires_at)
    except ValueError:
        return False
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)
    return datetime.now(UTC) > expiry


def _find_org(store: dict[str, Any], *, session_id: str | None = None, email: str | None = None) -> dict[str, Any] | None:
    normalized_email = email.strip().lower() if email else None
    for org in store.get("orgs", []):
        if session_id and org.get("stripe_session_id") == session_id:
            return org
        if normalized_email and normalized_email in org.get("authorized_emails", []):
            return org
    return None


def load_credentials() -> tuple[dict[str, _OrgCredential], dict[str, _OrgCredential]]:
    email_users: dict[str, _OrgCredential] = {}
    domain_users: dict[str, _OrgCredential] = {}

    for raw in _read_store().get("orgs", []):
        org = _normalize_org(raw)
        password_hash = org["password_hash"].encode("utf-8")
        credential = _OrgCredential(
            organization=org["organization"],
            password_hash=password_hash,
        )
        for authorized_email in org["authorized_emails"]:
            email_users[authorized_email] = credential

        company_domain = org["company_domain"]
        if company_domain:
            domain_users[company_domain.lower()] = credential

    return email_users, domain_users


def credentials_for_session(session_id: str) -> dict[str, str] | None:
    with _file_lock:
        store = _read_store()
        org = _find_org(store, session_id=session_id)
        if org is None:
            return None

        password = org.get("initial_password")
        email = org.get("authorized_emails", [None])[0]
        if not password or not email:
            return None

        return {
            "email": email,
            "organization": org.get("organization", ""),
            "password": password,
            "plan_id": org.get("plan_id", ""),
        }


def provision_from_stripe_session(session: Any) -> dict[str, Any] | None:
    if not auto_provision_enabled():
        logger.info("Stripe auto-provision skipped because AUTH_AUTO_PROVISION is disabled.")
        return None

    session_id = str(getattr(session, "id", "") or session.get("id", ""))
    status = str(getattr(session, "status", "") or session.get("status", ""))
    if status not in {"complete", "paid"}:
        return None

    customer_details = getattr(session, "customer_details", None) or session.get("customer_details") or {}
    email = str(getattr(customer_details, "email", None) or customer_details.get("email") or "").strip().lower()
    if not email or "@" not in email:
        logger.warning("Stripe checkout %s completed without a customer email.", session_id)
        return None

    metadata = getattr(session, "metadata", None) or session.get("metadata") or {}
    plan_id = str(metadata.get("plan_id") or "")
    business_name = str(
        getattr(customer_details, "business_name", None)
        or customer_details.get("business_name")
        or getattr(customer_details, "name", None)
        or customer_details.get("name")
        or ""
    ).strip()
    organization = business_name or _organization_name({}, email)
    company_domain = _company_domain(email)

    customer_id = str(getattr(session, "customer", None) or session.get("customer") or "")
    subscription_id = str(getattr(session, "subscription", None) or session.get("subscription") or "")

    with _file_lock:
        store = _read_store()
        existing = _find_org(store, session_id=session_id) or _find_org(store, email=email)
        if existing is not None:
            if session_id and existing.get("stripe_session_id") != session_id:
                existing["stripe_session_id"] = session_id
            if plan_id:
                existing["plan_id"] = plan_id
                if not existing.get("expires_at"):
                    created = str(existing.get("created_at") or datetime.now(UTC).isoformat())
                    existing["expires_at"] = _plan_expires_at(plan_id, created)
            if customer_id:
                existing["stripe_customer_id"] = customer_id
            if subscription_id:
                existing["stripe_subscription_id"] = subscription_id
            _write_store(store)
            logger.info(
                "Stripe checkout %s matched existing org %s for %s",
                session_id,
                existing.get("organization"),
                email,
            )
            return {
                "created": False,
                "email": email,
                "organization": existing.get("organization", organization),
                "password": existing.get("initial_password"),
                "plan_id": existing.get("plan_id", plan_id),
            }

        password = _generate_password()
        created_at = datetime.now(UTC).isoformat()
        org = {
            "stripe_session_id": session_id,
            "organization": organization,
            "company_domain": company_domain,
            "authorized_emails": [email],
            "password_hash": _hash_password(password).decode("utf-8"),
            "initial_password": password,
            "plan_id": plan_id,
            "created_at": created_at,
            "expires_at": _plan_expires_at(plan_id, created_at),
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
        }
        store.setdefault("orgs", []).append(org)
        _write_store(store)

    from app.auth import invalidate_credentials_cache

    invalidate_credentials_cache()

    logger.info(
        "Provisioned organization %s for %s from Stripe session %s",
        organization,
        email,
        session_id,
    )
    return {
        "created": True,
        "email": email,
        "organization": organization,
        "password": password,
        "plan_id": plan_id,
    }
