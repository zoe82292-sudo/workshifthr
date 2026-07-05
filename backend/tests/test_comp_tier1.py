from __future__ import annotations

from app.analyzer import analyze_file


def _csv_bytes(*rows: str) -> bytes:
    return "\n".join(rows).encode("utf-8")


def test_merit_matrix_flags_outside_band() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Merit Increase %",
        "E001,80000,90000,110000,1.0",
        "E002,95000,90000,110000,3.0",
        "E003,96000,90000,110000,3.0",
        "E004,97000,90000,110000,3.0",
    )
    result = analyze_file(content, "matrix.csv")
    assert result.merit_matrix.available is True
    assert result.summary.merit_matrix_flags >= 1
    assert any(flag.employee_id == "E001" for flag in result.merit_matrix.flags)


def test_range_structure_overlap_and_order() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Mid,Range Max,Job Level",
        "E001,95000,90000,100000,110000,3",
        "E002,96000,90000,100000,110000,3",
        "E003,88000,85000,95000,105000,2",
        "E004,89000,85000,95000,105000,2",
    )
    result = analyze_file(content, "ranges.csv")
    assert result.range_structure.available is True
    assert result.summary.range_structure_issues >= 1


def test_compa_summary_by_level_and_department() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Job Level,Department",
        "E001,95000,90000,110000,3,Engineering",
        "E002,96000,90000,110000,3,Engineering",
        "E003,88000,85000,100000,2,Sales",
        "E004,89000,85000,100000,2,Sales",
    )
    result = analyze_file(content, "compa-summary.csv")
    assert result.compa_penetration_summary.available is True
    assert len(result.compa_penetration_summary.by_level) >= 2
    assert len(result.compa_penetration_summary.by_department) >= 2


def test_total_cash_comp_with_bonus() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Bonus Target",
        "E001,100000,90000,110000,20",
        "E002,95000,90000,110000,15",
    )
    result = analyze_file(content, "tcc.csv")
    assert result.total_cash_comp.available is True
    record = next(row for row in result.total_cash_comp.employees if row.employee_id == "E001")
    assert record.total_cash_comp == 120000


def test_new_hire_placement_report() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Hire Date",
        "E001,85000,90000,110000,2026-01-15",
        "E002,95000,90000,110000,2020-06-01",
    )
    result = analyze_file(content, "new-hires.csv")
    assert result.new_hire_placement.available is True
    assert result.summary.new_hire_placement_flags >= 1
    assert any(row.below_minimum for row in result.new_hire_placement.employees)


def test_geo_pay_policy_flags() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Pay Zone,Geo Differential",
        "E001,95000,90000,110000,Zone A,10",
        "E002,96000,90000,110000,Zone A,10",
        "E003,97000,90000,110000,Zone A,10",
        "E004,98000,90000,110000,Zone A,25",
    )
    result = analyze_file(content, "geo.csv")
    assert result.geo_pay_policy.available is True
    assert result.summary.geo_pay_policy_flags >= 1


def test_currency_and_employee_type_reports() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Currency,Employee Type",
        "E001,95000,90000,110000,USD,Regular",
        "E002,88000,85000,100000,EUR,Regular",
        "E003,50000,45000,55000,USD,Intern",
    )
    result = analyze_file(content, "currency-type.csv")
    assert result.currency_report.available is True
    assert result.currency_report.multi_currency is True
    assert result.employee_type_report.available is True
    assert result.employee_type_report.excluded_count >= 1


def test_midpoint_progression_inversion() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Mid,Range Max,Job Level",
        "E001,95000,90000,100000,110000,3",
        "E002,96000,90000,100000,110000,3",
        "E003,88000,85000,95000,105000,4",
        "E004,89000,85000,95000,105000,4",
    )
    result = analyze_file(content, "midpoint.csv")
    assert result.midpoint_progression.available is True
    assert result.summary.midpoint_progression_issues >= 1
