from __future__ import annotations

from pathlib import Path

from app.analyzer import analyze_file

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_FILE = ROOT / "sample-data" / "compensation-sample.csv"


def test_analyze_sample_file_flags_issues() -> None:
    content = SAMPLE_FILE.read_bytes()
    result = analyze_file(content, SAMPLE_FILE.name)

    assert result.summary.total_rows > 0
    assert result.summary.below_minimum > 0
    assert result.column_mapping.salary is not None
    assert result.column_mapping.range_min is not None
    assert result.column_mapping.range_max is not None
    assert result.insights.executive_summary.headline
