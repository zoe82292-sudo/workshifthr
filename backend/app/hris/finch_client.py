from __future__ import annotations

import base64
import logging
import os
import time
from typing import Any

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

FINCH_API_BASE = "https://api.tryfinch.com"
TOKEN_TTL_SECONDS = 60 * 55

_hris_tokens: dict[str, tuple[str, float]] = {}


def _env(name: str) -> str:
    return os.getenv(name, "").strip().strip('"').strip("'")


def finch_client_id() -> str:
    return _env("FINCH_CLIENT_ID")


def finch_client_secret() -> str:
    return _env("FINCH_CLIENT_SECRET")


def finch_sandbox() -> bool:
    return _env("FINCH_SANDBOX").lower() in {"1", "true", "yes"}


def hris_enabled() -> bool:
    return bool(finch_client_id() and finch_client_secret())


def hris_missing_config() -> list[str]:
    missing: list[str] = []
    if not finch_client_id():
        missing.append("FINCH_CLIENT_ID")
    if not finch_client_secret():
        missing.append("FINCH_CLIENT_SECRET")
    return missing


def _public_app_url() -> str:
    return _env("PUBLIC_APP_URL") or "http://localhost:5173"


def _basic_auth_header() -> str:
    client_id = finch_client_id()
    secret = finch_client_secret()
    token = base64.b64encode(f"{client_id}:{secret}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _require_finch() -> None:
    if not hris_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "HRIS connect is not configured on this server yet. "
                "Upload a spreadsheet instead, or contact hello@shiftworkshr.com."
            ),
        )


def store_access_token(user_key: str, access_token: str) -> None:
    _hris_tokens[user_key] = (access_token, time.time() + TOKEN_TTL_SECONDS)


def get_access_token(user_key: str) -> str | None:
    entry = _hris_tokens.get(user_key)
    if entry is None:
        return None
    token, expires_at = entry
    if time.time() >= expires_at:
        _hris_tokens.pop(user_key, None)
        return None
    return token


def clear_access_token(user_key: str) -> None:
    _hris_tokens.pop(user_key, None)


async def create_connect_session(
    *,
    user_key: str,
    customer_name: str,
    finch_provider: str,
) -> dict[str, str]:
    _require_finch()
    redirect_uri = f"{_public_app_url().rstrip('/')}/hris/callback"
    payload: dict[str, Any] = {
        "customer_id": user_key,
        "customer_name": customer_name,
        "products": ["directory", "individual", "employment"],
        "redirect_uri": redirect_uri,
        "integration": {
            "provider": finch_provider,
        },
        "sandbox": finch_sandbox(),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{FINCH_API_BASE}/connect/sessions",
            headers={
                "Authorization": _basic_auth_header(),
                "Content-Type": "application/json",
                "Finch-API-Version": "2020-09-17",
            },
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("Finch connect session failed: %s %s", response.status_code, response.text)
        detail = response.json().get("message") if response.headers.get("content-type", "").startswith("application/json") else response.text
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to start HRIS connection: {detail}",
        )

    data = response.json()
    connect_url = data.get("connect_url")
    session_id = data.get("session_id")
    if not connect_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="HRIS provider did not return a connect URL.",
        )
    return {"connect_url": connect_url, "session_id": session_id or ""}


async def exchange_auth_code(code: str) -> str:
    _require_finch()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{FINCH_API_BASE}/auth/token",
            headers={
                "Authorization": _basic_auth_header(),
                "Content-Type": "application/json",
                "Finch-API-Version": "2020-09-17",
            },
            json={"code": code},
        )

    if response.status_code >= 400:
        logger.error("Finch token exchange failed: %s %s", response.status_code, response.text)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HRIS authorization failed or expired. Please try connecting again.",
        )

    data = response.json()
    access_token = data.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="HRIS provider did not return an access token.",
        )
    return access_token


async def _finch_get(access_token: str, path: str, params: dict[str, Any] | None = None) -> Any:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            f"{FINCH_API_BASE}{path}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Finch-API-Version": "2020-09-17",
            },
            params=params,
        )

    if response.status_code >= 400:
        logger.error("Finch GET %s failed: %s %s", path, response.status_code, response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to read data from HRIS ({path}).",
        )
    return response.json()


async def _finch_post(access_token: str, path: str, payload: dict[str, Any]) -> Any:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{FINCH_API_BASE}{path}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Finch-API-Version": "2020-09-17",
            },
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("Finch POST %s failed: %s %s", path, response.status_code, response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to read data from HRIS ({path}).",
        )
    return response.json()


async def fetch_employee_records(access_token: str) -> list[dict[str, Any]]:
    directory = await _finch_get(access_token, "/employer/directory")
    individuals_meta = directory.get("individuals") or []
    if not individuals_meta:
        return []

    individual_ids = [entry.get("id") for entry in individuals_meta if entry.get("id")]
    if not individual_ids:
        return []

    individual_response = await _finch_post(
        access_token,
        "/employer/individual",
        {"requests": [{"individual_id": individual_id} for individual_id in individual_ids]},
    )
    employment_response = await _finch_post(
        access_token,
        "/employer/employment",
        {"requests": [{"individual_id": individual_id} for individual_id in individual_ids]},
    )

    individuals_by_id = _index_responses(individual_response)
    employment_by_id = _index_responses(employment_response)

    records: list[dict[str, Any]] = []
    for individual_id in individual_ids:
        individual = individuals_by_id.get(individual_id, {})
        employment = employment_by_id.get(individual_id, {})
        records.append(
            {
                "employee_id": individual_id,
                "employee_name": _full_name(individual),
                "department": _department_name(employment),
                "job_level": employment.get("title"),
                "manager_id": _manager_id(employment),
                "gender": individual.get("gender"),
                "race_ethnicity": individual.get("ethnicity"),
                "salary": _yearly_income(employment),
                "start_date": employment.get("start_date"),
            }
        )
    return records


def _index_responses(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for item in payload.get("responses") or []:
        individual_id = item.get("individual_id")
        body = item.get("body") or {}
        if individual_id:
            indexed[individual_id] = body
    return indexed


def _full_name(individual: dict[str, Any]) -> str | None:
    first = str(individual.get("first_name") or "").strip()
    last = str(individual.get("last_name") or "").strip()
    name = " ".join(part for part in [first, last] if part)
    return name or None


def _department_name(employment: dict[str, Any]) -> str | None:
    department = employment.get("department")
    if isinstance(department, dict):
        return department.get("name") or department.get("id")
    if isinstance(department, str):
        return department
    return None


def _manager_id(employment: dict[str, Any]) -> str | None:
    manager = employment.get("manager") or employment.get("manager_id")
    if isinstance(manager, dict):
        return manager.get("id")
    if isinstance(manager, str):
        return manager
    return None


def _yearly_income(employment: dict[str, Any]) -> float | None:
    income = employment.get("income")
    if not isinstance(income, dict):
        return None

    amount = income.get("amount")
    if amount is None:
        return None

    try:
        value = float(amount)
    except (TypeError, ValueError):
        return None

    unit = str(income.get("unit") or "yearly").lower()
    if unit in {"hourly", "hour"}:
        return round(value * 2080, 2)
    if unit in {"monthly", "month"}:
        return round(value * 12, 2)

    # Finch amounts are usually cents for yearly USD compensation.
    if value > 100_000:
        return round(value / 100, 2)
    return round(value, 2)
