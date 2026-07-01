from __future__ import annotations

from pathlib import Path

import pytest

from app.analyzer import analyze_file

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_FILE = ROOT / "sample-data" / "compensation-sample.csv"


@pytest.fixture()
def sample_analysis_result():
    content = SAMPLE_FILE.read_bytes()
    return analyze_file(content, SAMPLE_FILE.name)
