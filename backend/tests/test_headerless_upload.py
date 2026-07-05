from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.analyzer import analyze_file
from app.columns import detect_column_mapping, mapping_has_required, normalize_upload_dataframe


def test_normalize_headerless_csv_layout() -> None:
    frame = pd.DataFrame(
        [
            ["NG001", "Alex Morgan", 178000, 165000, 195000],
            ["NG002", "Jordan Lee", 142000, 135000, 160000],
            ["NG003", "Sam Rivera", 118000, 115000, 135000],
            ["NG004", "Taylor Kim", 97000, 95000, 115000],
        ],
        columns=["NG001", "Alex Morgan", 178000, 165000, 195000],
    )

    normalized, warnings = normalize_upload_dataframe(frame)

    assert warnings
    assert mapping_has_required(detect_column_mapping(list(normalized.columns), normalized))


def test_analyze_headerless_export_from_sample() -> None:
    sample_path = Path(__file__).resolve().parents[2] / "sample-data" / "northgate-review-2026-clean.csv"
    if not sample_path.exists():
        return

    lines = sample_path.read_text(encoding="utf-8").splitlines()
    body = "\n".join(lines[1:6]).encode("utf-8")
    result = analyze_file(body, "headerless.csv")

    assert result.summary.valid_rows >= 4
    assert result.summary.below_minimum >= 0
