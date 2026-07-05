from __future__ import annotations

from datetime import datetime, timedelta

from app.analyzer import analyze_file


def _csv_bytes(*rows: str) -> bytes:
    return "\n".join(rows).encode("utf-8")


def test_equity_grants_include_all_rows_when_no_outliers() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Equity Grant %",
        "E001,95000,90000,110000,10",
        "E002,96000,90000,110000,12",
        "E003,97000,90000,110000,14",
        "E004,98000,90000,110000,16",
        "E005,99000,90000,110000,18",
    )
    result = analyze_file(content, "equity-grants.csv")
    assert len(result.equity_grants) == 5
    assert result.summary.equity_grant_outliers == 0


def test_merit_compa_flags_under_correction() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Merit Increase %",
        "E001,85000,90000,110000,2.0",
        "E002,96000,90000,110000,4.0",
        "E003,97000,90000,110000,4.0",
        "E004,98000,90000,110000,4.0",
        "E005,99000,90000,110000,4.0",
    )
    result = analyze_file(content, "merit-compa.csv")
    assert any(flag.flag_type == "under_correction" for flag in result.merit_compa_flags)
    assert result.summary.merit_compa_flags >= 1


def test_new_hires_below_range_count() -> None:
    recent_hire = (datetime.now().date() - timedelta(days=120)).isoformat()
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Hire Date",
        f"E001,85000,90000,110000,{recent_hire}",
        "E002,96000,90000,110000,2020-01-01",
        "E003,97000,90000,110000,2020-01-01",
        "E004,98000,90000,110000,2020-01-01",
    )
    result = analyze_file(content, "new-hire-range.csv")
    assert result.summary.below_minimum == 1
    assert result.summary.new_hires_below_range == 1
