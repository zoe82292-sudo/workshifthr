from __future__ import annotations

from datetime import datetime, timedelta

from app.analyzer import analyze_file


def _csv_bytes(*rows: str) -> bytes:
    return "\n".join(rows).encode("utf-8")


def test_tenure_report_available_with_hire_date() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Hire Date",
        "E001,95000,90000,110000,2020-01-01",
        "E002,96000,90000,110000,2018-06-01",
        "E003,97000,90000,110000,2015-03-01",
        "E004,98000,90000,110000,2024-11-01",
        "E005,99000,90000,110000,2023-01-01",
    )
    result = analyze_file(content, "tenure.csv")
    assert result.tenure.available is True
    assert len(result.tenure.bands) >= 1
    assert len(result.tenure.employees) == 5


def test_tenure_flags_short_tenure_high_pay() -> None:
    recent_hire = (datetime.now().date() - timedelta(days=120)).isoformat()
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Hire Date",
        f"E001,125000,90000,110000,{recent_hire}",
        "E002,96000,90000,110000,2020-01-01",
        "E003,97000,90000,110000,2018-01-01",
        "E004,98000,90000,110000,2017-01-01",
        "E005,99000,90000,110000,2016-01-01",
    )
    result = analyze_file(content, "tenure-flags.csv")
    assert any(flag.flag_type == "short_tenure_high_pay" for flag in result.tenure.flags)
    assert result.summary.tenure_pay_flags >= 1


def test_location_pay_report_available_with_location_column() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Work Location,Job Level",
        "E001,120000,90000,130000,Boston,4",
        "E002,118000,90000,130000,Boston,4",
        "E003,119000,90000,130000,Boston,4",
        "E004,119500,90000,130000,Boston,4",
        "E005,118500,90000,130000,Boston,4",
        "E006,90000,90000,130000,Remote,4",
        "E007,91000,90000,130000,Remote,4",
        "E008,92000,90000,130000,Remote,4",
        "E009,93000,90000,130000,Remote,4",
        "E010,94000,90000,130000,Remote,4",
    )
    result = analyze_file(content, "location.csv")
    assert result.location_pay.available is True
    assert len(result.location_pay.location_groups) >= 2
    assert result.summary.location_pay_gaps >= 1


def test_location_pay_skipped_without_location_column() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Hire Date",
        "E001,95000,90000,110000,2020-01-01",
        "E002,96000,90000,110000,2018-06-01",
        "E003,97000,90000,110000,2015-03-01",
        "E004,98000,90000,110000,2024-11-01",
    )
    result = analyze_file(content, "no-location.csv")
    assert result.location_pay.available is False
    assert result.tenure.available is True
