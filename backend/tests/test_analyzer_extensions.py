from __future__ import annotations

from datetime import datetime, timedelta

import pandas as pd

from app.analyzer import PLANNED_EFFECTIVE_HORIZON_MONTHS, analyze_file
from app.models import AnalysisOptions, ColumnMapping
from app.saved_mappings import get_saved_mapping, save_saved_mapping


def _csv_bytes(*rows: str) -> bytes:
    return "\n".join(rows).encode("utf-8")


def _base_header() -> str:
    return (
        "Employee ID,Salary,Range Min,Range Max,Effective Date,Merit Increase %,"
        "Hire Date,Promotion Increase %,Equity Grant %"
    )


def _base_row(
    employee_id: str,
    salary: int,
    *,
    effective_date: str = "2026-01-01",
    merit: str = "3.0",
    hire_date: str = "2020-01-01",
    promotion: str = "10",
    equity: str = "10",
) -> str:
    return (
        f"{employee_id},{salary},90000,110000,{effective_date},{merit},"
        f"{hire_date},{promotion},{equity}"
    )


def test_planned_effective_date_within_horizon_is_allowed() -> None:
    today = pd.Timestamp(datetime.now().date())
    within_horizon = (today + pd.DateOffset(months=PLANNED_EFFECTIVE_HORIZON_MONTHS - 1)).strftime(
        "%Y-%m-%d"
    )
    content = _csv_bytes(
        _base_header(),
        _base_row("E001", 95000, effective_date=within_horizon),
        _base_row("E002", 96000),
        _base_row("E003", 97000),
        _base_row("E004", 98000),
    )
    result = analyze_file(content, "planned-dates.csv")
    assert result.summary.invalid_effective_dates == 0


def test_effective_date_beyond_horizon_is_flagged() -> None:
    today = pd.Timestamp(datetime.now().date())
    beyond_horizon = (today + pd.DateOffset(months=PLANNED_EFFECTIVE_HORIZON_MONTHS + 2)).strftime(
        "%Y-%m-%d"
    )
    content = _csv_bytes(
        _base_header(),
        _base_row("E001", 95000, effective_date=beyond_horizon),
        _base_row("E002", 96000),
        _base_row("E003", 97000),
        _base_row("E004", 98000),
    )
    result = analyze_file(content, "planned-dates.csv")
    assert result.summary.invalid_effective_dates == 1
    assert "future" in result.invalid_effective_dates[0].reason.lower()


def test_new_hire_merit_flag_within_90_days() -> None:
    recent_hire = (datetime.now().date() - timedelta(days=45)).isoformat()
    content = _csv_bytes(
        _base_header(),
        _base_row("E001", 95000, hire_date=recent_hire, merit="4.5"),
        _base_row("E002", 96000),
        _base_row("E003", 97000),
        _base_row("E004", 98000),
    )
    result = analyze_file(content, "new-hire.csv")
    assert result.summary.new_hire_merit_flags == 1
    assert result.new_hire_merit_flags[0].employee_id == "E001"
    assert result.new_hire_merit_flags[0].merit_increase == 4.5


def test_promotion_and_equity_outliers() -> None:
    content = _csv_bytes(
        _base_header(),
        _base_row("E001", 95000, promotion="10", equity="10"),
        _base_row("E002", 96000, promotion="11", equity="12"),
        _base_row("E003", 97000, promotion="12", equity="14"),
        _base_row("E004", 98000, promotion="40", equity="75"),
    )
    result = analyze_file(content, "comp-changes.csv")
    assert result.summary.unusual_comp_changes >= 2
    change_types = {record.change_type for record in result.unusual_comp_changes}
    assert "promotion" in change_types
    assert "equity" in change_types


def test_custom_merit_iqr_multiplier() -> None:
    content = _csv_bytes(
        _base_header(),
        _base_row("E001", 95000, merit="3.0"),
        _base_row("E002", 96000, merit="3.1"),
        _base_row("E003", 97000, merit="3.2"),
        _base_row("E004", 98000, merit="12.0"),
    )
    strict = analyze_file(content, "merit.csv", options=AnalysisOptions(merit_iqr_multiplier=0.5))
    relaxed = analyze_file(content, "merit.csv", options=AnalysisOptions(merit_iqr_multiplier=3.0))
    assert strict.summary.outlier_merit_increases >= relaxed.summary.outlier_merit_increases


def test_saved_mapping_roundtrip() -> None:
    mapping = ColumnMapping(
        employee_id="Employee ID",
        employee_name="Employee Name",
        salary="Salary",
        range_min="Range Min",
        range_max="Range Max",
        hire_date="Hire Date",
        promotion_increase="Promotion Increase %",
        equity_grant="Equity Grant %",
    )
    saved = save_saved_mapping("Acme Corp", "analyst@acme.com", mapping)
    loaded = get_saved_mapping("Acme Corp", "analyst@acme.com")
    assert saved.employee_id == "Employee ID"
    assert loaded is not None
    assert loaded.hire_date == "Hire Date"
    assert loaded.promotion_increase == "Promotion Increase %"
