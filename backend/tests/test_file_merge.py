from __future__ import annotations

import pandas as pd
import pytest

from app.file_merge import analyze_merged_files, canonicalize_dataframe, merge_canonical_dataframes
from app.models import ColumnMapping


def test_merge_fills_missing_columns_from_second_file() -> None:
    first = pd.DataFrame(
        {
            "employee_id": ["E001", "E002"],
            "salary": [95000, 88000],
        }
    )
    second = pd.DataFrame(
        {
            "employee_id": ["E001", "E002"],
            "range_min": [90000, 85000],
            "range_max": [110000, 100000],
        }
    )

    merged, warnings = merge_canonical_dataframes([first, second])
    assert len(merged) == 2
    assert merged.loc[merged["employee_id"] == "E001", "salary"].iloc[0] == 95000
    assert merged.loc[merged["employee_id"] == "E001", "range_min"].iloc[0] == 90000
    assert any("Merged 2 files" in warning for warning in warnings)


def test_canonicalize_requires_employee_id() -> None:
    df = pd.DataFrame({"Salary": [95000]})
    mapping = ColumnMapping(salary="Salary")
    with pytest.raises(ValueError, match="Employee ID"):
        canonicalize_dataframe(df, mapping, "pay.csv")


def test_analyze_merged_files_from_csv_bytes() -> None:
    pay_csv = (
        "Employee ID,Salary\n"
        "E001,95000\n"
        "E002,88000\n"
    ).encode("utf-8")
    ranges_csv = (
        "Employee ID,Range Min,Range Max\n"
        "E001,90000,110000\n"
        "E002,85000,100000\n"
    ).encode("utf-8")

    pay_mapping = ColumnMapping(employee_id="Employee ID", salary="Salary")
    range_mapping = ColumnMapping(
        employee_id="Employee ID",
        range_min="Range Min",
        range_max="Range Max",
    )

    result = analyze_merged_files(
        [
            (pay_csv, "pay.csv", None, pay_mapping),
            (ranges_csv, "ranges.csv", None, range_mapping),
        ]
    )

    assert result.summary.valid_rows == 2
    assert result.summary.below_minimum >= 0
    assert any("Merged 2 files" in warning for warning in result.warnings)
