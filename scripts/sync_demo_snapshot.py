#!/usr/bin/env python3
"""Regenerate the bundled demo analysis snapshot from sample-data/compensation-sample.csv.

Run after changing the analyzer or the sample CSV so marketing previews match the live tool:

    python scripts/sync_demo_snapshot.py

Or from the frontend package:

    npm run sync:demo
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
SAMPLE_FILE = ROOT / "sample-data" / "compensation-sample.csv"
OUTPUT = ROOT / "frontend" / "src" / "data" / "demo-analysis.snapshot.json"

sys.path.insert(0, str(BACKEND))

from app.analyzer import analyze_file  # noqa: E402


def main() -> None:
    if not SAMPLE_FILE.is_file():
        raise SystemExit(f"Sample file not found: {SAMPLE_FILE}")

    content = SAMPLE_FILE.read_bytes()
    result = analyze_file(content, SAMPLE_FILE.name)
    payload = json.loads(result.model_dump_json())
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({result.summary.valid_rows} valid rows)")


if __name__ == "__main__":
    main()
