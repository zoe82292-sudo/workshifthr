#!/usr/bin/env python3
"""End-to-end API smoke: login → preview → analyze → save history."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "sample-data" / "compensation-sample.csv"
BASE = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
EMAIL = os.environ.get("SMOKE_EMAIL", "smoke@shiftworkshr.com")
PASSWORD = os.environ.get("SMOKE_PASSWORD", "SmokeTestPass123!")
USE_TESTCLIENT = os.environ.get("SMOKE_USE_TESTCLIENT", "").lower() in {"1", "true", "yes"}


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"OK: {message}")


def run_with_testclient() -> None:
    os.environ.setdefault("JWT_SECRET", "local-smoke-jwt-secret-at-least-32-characters-long")
    os.environ.setdefault(
        "AUTH_USERS",
        json.dumps(
            [
                {
                    "organization": "Smoke Org",
                    "password": PASSWORD,
                    "emails": [EMAIL],
                }
            ]
        ),
    )
    from fastapi.testclient import TestClient

    from app.auth import invalidate_credentials_cache
    from app.main import app

    invalidate_credentials_cache()
    client = TestClient(app)

    health = client.get("/api/health")
    if health.status_code != 200:
        fail(f"health → {health.status_code}")
    ok(f"health ({health.json().get('git_commit', 'local')[:8]})")

    login = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if login.status_code != 200:
        fail(f"login → {login.status_code}: {login.text}")
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    ok(f"login as {EMAIL}")

    with SAMPLE.open("rb") as handle:
        preview = client.post(
            "/api/preview",
            headers=headers,
            files={"file": (SAMPLE.name, handle, "text/csv")},
        )
    if preview.status_code != 200:
        fail(f"preview → {preview.status_code}: {preview.text}")
    mapping = preview.json()["suggested_mapping"]
    ok("preview + column detection")

    with SAMPLE.open("rb") as handle:
        analyze = client.post(
            "/api/analyze",
            headers=headers,
            data={"column_mapping": json.dumps(mapping)},
            files={"file": (SAMPLE.name, handle, "text/csv")},
        )
    if analyze.status_code != 200:
        fail(f"analyze → {analyze.status_code}: {analyze.text}")
    result = analyze.json()
    ok(
        f"analyze — {result['summary']['valid_rows']} valid rows, "
        f"{result['summary']['below_minimum']} below min"
    )

    save = client.post(
        "/api/analysis/history",
        headers=headers,
        json={"file_name": SAMPLE.name, "result": result},
    )
    if save.status_code != 200:
        fail(f"save history → {save.status_code}: {save.text}")
    ok(f"save history ({save.json()['id']})")

    listed = client.get("/api/analysis/history", headers=headers)
    if listed.status_code != 200 or not listed.json():
        fail(f"list history → {listed.status_code}")
    ok(f"list history — {len(listed.json())} saved run(s)")


def run_with_http() -> None:
    import httpx

    with httpx.Client(base_url=BASE, timeout=60.0) as client:
        health = client.get("/api/health")
        if health.status_code != 200:
            fail(f"health → {health.status_code}")
        ok(f"health ({health.json().get('git_commit', 'local')[:8]})")

        login = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if login.status_code != 200:
            fail(f"login → {login.status_code}: {login.text}")
        token = login.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        ok(f"login as {EMAIL}")

        with SAMPLE.open("rb") as handle:
            preview = client.post(
                "/api/preview",
                headers=headers,
                files={"file": (SAMPLE.name, handle, "text/csv")},
            )
        if preview.status_code != 200:
            fail(f"preview → {preview.status_code}: {preview.text}")
        mapping = preview.json()["suggested_mapping"]
        ok("preview + column detection")

        with SAMPLE.open("rb") as handle:
            analyze = client.post(
                "/api/analyze",
                headers=headers,
                data={"column_mapping": json.dumps(mapping)},
                files={"file": (SAMPLE.name, handle, "text/csv")},
            )
        if analyze.status_code != 200:
            fail(f"analyze → {analyze.status_code}: {analyze.text}")
        result = analyze.json()
        ok(
            f"analyze — {result['summary']['valid_rows']} valid rows, "
            f"{result['summary']['below_minimum']} below min"
        )

        save = client.post(
            "/api/analysis/history",
            headers={**headers, "Content-Type": "application/json"},
            json={"file_name": SAMPLE.name, "result": result},
        )
        if save.status_code != 200:
            fail(f"save history → {save.status_code}: {save.text}")
        ok(f"save history ({save.json()['id']})")

        listed = client.get("/api/analysis/history", headers=headers)
        if listed.status_code != 200 or not listed.json():
            fail(f"list history → {listed.status_code}")
        ok(f"list history — {len(listed.json())} saved run(s)")


def main() -> None:
    if not SAMPLE.is_file():
        fail(f"Sample file missing: {SAMPLE}")

    if USE_TESTCLIENT:
        sys.path.insert(0, str(ROOT / "backend"))
        run_with_testclient()
    else:
        run_with_http()

    print("\nAll customer-flow checks passed.")


if __name__ == "__main__":
    main()
