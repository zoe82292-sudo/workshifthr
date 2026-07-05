from __future__ import annotations

from app.analyzer import analyze_file


def _csv_bytes(*rows: str) -> bytes:
    return "\n".join(rows).encode("utf-8")


def test_review_queue_prioritizes_below_minimum() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Merit Increase %",
        "E001,85000,90000,110000,3.0",
        "E002,95000,90000,110000,3.0",
    )
    result = analyze_file(content, "queue.csv")
    assert result.review_queue.available is True
    assert result.review_queue.total_items >= 1
    assert result.summary.review_queue_items >= 1
    assert result.review_queue.items[0].severity == "critical"


def test_penetration_distribution() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max",
        "E001,95000,90000,110000",
        "E002,100000,90000,110000",
        "E003,105000,90000,110000",
    )
    result = analyze_file(content, "penetration.csv")
    assert result.penetration_distribution.available is True
    assert result.penetration_distribution.total_employees == 3


def test_performance_merit_flags() -> None:
    content = _csv_bytes(
        "Employee ID,Salary,Range Min,Range Max,Merit Increase %,Performance Rating",
        "E001,95000,90000,110000,3.0,Exceeds",
        "E002,96000,90000,110000,3.0,Meets",
        "E003,97000,90000,110000,3.0,Meets",
        "E004,98000,90000,110000,8.0,Low",
    )
    result = analyze_file(content, "perf-merit.csv")
    assert result.performance_merit.available is True
    assert result.summary.performance_merit_flags >= 1
