from __future__ import annotations

from app.analyzer import analyze_file


def _csv_bytes(*rows: str) -> bytes:
    return "\n".join(rows).encode("utf-8")


def test_merit_by_department_and_post_merit_compa() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Department,Merit Increase %,Job Level",
        "E001,95000,90000,110000,Engineering,4.2,3",
        "E002,96000,90000,110000,Engineering,4.0,3",
        "E003,97000,90000,110000,Engineering,3.8,3",
        "E004,88000,85000,100000,Sales,3.1,2",
        "E005,89000,85000,100000,Sales,3.0,2",
    )
    result = analyze_file(content, "merit-dept.csv")
    assert result.merit_by_department.available is True
    engineering = next(
        dept for dept in result.merit_by_department.departments if dept.department == "Engineering"
    )
    sales = next(dept for dept in result.merit_by_department.departments if dept.department == "Sales")
    assert engineering.average_merit_percent == 4.0
    assert sales.average_merit_percent == 3.05
    assert result.post_merit_compa.available is True
    assert result.post_merit_compa.average_projected_compa is not None


def test_peer_spread_flags_same_level_department() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Department,Job Level",
        "E001,90000,85000,110000,Engineering,3",
        "E002,110000,85000,110000,Engineering,3",
        "E003,95000,85000,110000,Sales,2",
        "E004,96000,85000,110000,Sales,2",
    )
    result = analyze_file(content, "peer-spread.csv")
    assert result.peer_spread.available is True
    assert result.summary.peer_spread_flags >= 2


def test_bonus_target_outliers_by_level() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Job Level,Bonus Target",
        "E001,95000,90000,110000,3,15",
        "E002,96000,90000,110000,3,15",
        "E003,97000,90000,110000,3,16",
        "E004,98000,90000,110000,3,14",
        "E005,99000,90000,110000,3,45",
    )
    result = analyze_file(content, "bonus-outlier.csv")
    assert result.bonus_target_review.available is True
    assert result.summary.bonus_target_outliers >= 1
