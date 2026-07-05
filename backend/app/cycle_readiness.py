from __future__ import annotations

from typing import Any

import pandas as pd

from app.models import (
    MeritBudgetVariance,
    MeritBudgetVarianceReport,
    PenetrationBandCount,
    PenetrationDistribution,
    PerformanceMeritFlag,
    PerformanceMeritReport,
    ReviewQueueItem,
    ReviewQueueReport,
)

PENETRATION_BAND_LABELS = {
    "below_range": "Below range",
    "bottom_quartile": "0–25%",
    "mid_range": "25–75%",
    "top_quartile": "75–100%",
    "above_range": "Above range",
}

PERFORMANCE_LOW_KEYWORDS = {
    "1",
    "2",
    "low",
    "below",
    "needs improvement",
    "unsatisfactory",
    "partially meets",
    "does not meet",
    "dm",
    "pip",
}

PERFORMANCE_HIGH_KEYWORDS = {
    "4",
    "5",
    "high",
    "exceeds",
    "outstanding",
    "exceptional",
    "top",
    "strong",
    " exceeds expectations",
}


def build_penetration_distribution(range_penetration: list[Any]) -> PenetrationDistribution:
    if not range_penetration:
        return PenetrationDistribution(available=False)

    counts: dict[str, int] = {band: 0 for band in PENETRATION_BAND_LABELS}
    for employee in range_penetration:
        band = employee.penetration_band or "mid_range"
        if band not in counts:
            counts[band] = 0
        counts[band] += 1

    total = sum(counts.values()) or 1
    bands = [
        PenetrationBandCount(
            band=band,
            label=label,
            count=counts.get(band, 0),
            percent=round((counts.get(band, 0) / total) * 100, 1),
        )
        for band, label in PENETRATION_BAND_LABELS.items()
    ]
    return PenetrationDistribution(available=True, bands=bands, total_employees=total)


def _queue_item(
    *,
    priority: int,
    severity: str,
    category: str,
    tab_id: str,
    reason: str,
    employee_id: str | None = None,
    employee_name: str | None = None,
    department: str | None = None,
    job_level: str | None = None,
    row_number: int | None = None,
) -> ReviewQueueItem:
    return ReviewQueueItem(
        priority=priority,
        severity=severity,
        category=category,
        tab_id=tab_id,
        reason=reason,
        employee_id=employee_id,
        employee_name=employee_name,
        department=department,
        job_level=job_level,
        row_number=row_number,
    )


def build_review_queue(result: Any) -> ReviewQueueReport:
    items: list[ReviewQueueItem] = []

    for employee in result.below_minimum:
        items.append(
            _queue_item(
                priority=1,
                severity="critical",
                category="Below range minimum",
                tab_id="below_minimum",
                employee_id=employee.employee_id,
                employee_name=employee.employee_name,
                department=employee.department,
                job_level=employee.job_level,
                row_number=employee.row_number,
                reason=(
                    f"Salary ${employee.salary:,.0f} is below range minimum "
                    f"${employee.range_min:,.0f}."
                    if employee.salary is not None and employee.range_min is not None
                    else "Employee is below range minimum."
                ),
            )
        )

    for record in result.new_hire_placement.employees:
        if record.below_minimum:
            items.append(
                _queue_item(
                    priority=1,
                    severity="critical",
                    category="New hire below range",
                    tab_id="new_hire_placement",
                    employee_id=record.employee_id,
                    employee_name=record.employee_name,
                    department=record.department,
                    job_level=record.job_level,
                    row_number=record.row_number,
                    reason=f"Hired {record.tenure_days} days ago and still below range minimum.",
                )
            )

    for issue in result.managers_below_reports:
        items.append(
            _queue_item(
                priority=1,
                severity="critical",
                category="Manager inversion",
                tab_id="managers_below_reports",
                employee_id=issue.manager_id,
                employee_name=issue.manager_name,
                row_number=issue.row_number,
                reason=(
                    f"Manager paid ${issue.manager_salary:,.0f} vs direct report "
                    f"${issue.report_salary:,.0f} ({issue.report_name or issue.report_id})."
                ),
            )
        )

    for flag in result.merit_matrix.flags:
        items.append(
            _queue_item(
                priority=2,
                severity="high",
                category="Merit matrix",
                tab_id="merit_matrix",
                employee_id=flag.employee_id,
                employee_name=flag.employee_name,
                department=flag.department,
                job_level=flag.job_level,
                row_number=flag.row_number,
                reason=flag.reason,
            )
        )

    for flag in result.merit_compa_flags:
        items.append(
            _queue_item(
                priority=2,
                severity="high",
                category="Merit vs compa",
                tab_id="merit_compa_flags",
                employee_id=flag.employee_id,
                employee_name=flag.employee_name,
                department=flag.department,
                row_number=flag.row_number,
                reason=flag.reason,
            )
        )

    for record in result.outlier_merit_increases:
        items.append(
            _queue_item(
                priority=2,
                severity="high",
                category="Outlier merit",
                tab_id="outlier_merit_increases",
                employee_id=record.employee_id,
                employee_name=record.employee_name,
                row_number=record.row_number,
                reason=record.reason,
            )
        )

    for record in result.new_hire_merit_flags:
        items.append(
            _queue_item(
                priority=2,
                severity="high",
                category="New-hire merit",
                tab_id="new_hire_merit_flags",
                employee_id=record.employee_id,
                employee_name=record.employee_name,
                row_number=record.row_number,
                reason=record.reason,
            )
        )

    for issue in result.compression:
        items.append(
            _queue_item(
                priority=3,
                severity="moderate",
                category="Compression",
                tab_id="compression",
                employee_id=issue.employee_id,
                employee_name=issue.employee_name,
                row_number=issue.row_number,
                reason=issue.description,
            )
        )

    for flag in result.peer_spread.flags[:50]:
        items.append(
            _queue_item(
                priority=3,
                severity="moderate",
                category="Peer pay spread",
                tab_id="peer_spread",
                employee_id=flag.employee_id,
                employee_name=flag.employee_name,
                department=flag.department,
                job_level=flag.job_level,
                row_number=flag.row_number,
                reason=flag.reason,
            )
        )

    for employee in result.above_maximum[:100]:
        items.append(
            _queue_item(
                priority=3,
                severity="moderate",
                category="Above range maximum",
                tab_id="above_maximum",
                employee_id=employee.employee_id,
                employee_name=employee.employee_name,
                department=employee.department,
                job_level=employee.job_level,
                row_number=employee.row_number,
                reason=(
                    f"Salary ${employee.salary:,.0f} exceeds range maximum "
                    f"${employee.range_max:,.0f}."
                    if employee.salary is not None and employee.range_max is not None
                    else "Employee is above range maximum."
                ),
            )
        )

    for issue in result.range_structure.issues:
        items.append(
            _queue_item(
                priority=3,
                severity="moderate",
                category="Range structure",
                tab_id="range_structure",
                reason=issue.description,
            )
        )

    for outlier in result.bonus_target_review.outliers:
        items.append(
            _queue_item(
                priority=4,
                severity="info",
                category="Bonus target",
                tab_id="missing_bonus_targets",
                employee_id=outlier.employee_id,
                employee_name=outlier.employee_name,
                department=outlier.department,
                job_level=outlier.job_level,
                row_number=outlier.row_number,
                reason=outlier.reason,
            )
        )

    for group in result.duplicate_ids:
        items.append(
            _queue_item(
                priority=2,
                severity="high",
                category="Duplicate ID",
                tab_id="duplicate_ids",
                employee_id=group.employee_id,
                reason=f"Employee ID appears {group.count} times (rows {', '.join(map(str, group.rows))}).",
            )
        )

    items.sort(key=lambda item: (item.priority, item.row_number or 0))
    critical = sum(1 for item in items if item.severity == "critical")
    high = sum(1 for item in items if item.severity == "high")

    return ReviewQueueReport(
        available=True,
        items=items,
        total_items=len(items),
        critical_count=critical,
        high_count=high,
        disclaimer=(
            "Review queue prioritizes compensation issues for cycle readiness. "
            "Critical items should be addressed before finalizing merit recommendations."
        ),
    )


def build_merit_budget_variance_report(result: Any) -> MeritBudgetVarianceReport:
    merit_calc = result.insights.merit_calculator
    if not merit_calc.employees_with_merit_data:
        return MeritBudgetVarianceReport(
            available=False,
            disclaimer="Upload merit increase values to compare projected pool vs file averages.",
        )

    file_pool = merit_calc.projected_merit_pool
    file_avg = merit_calc.average_merit_percent
    departments: list[MeritBudgetVariance] = []

    for dept in result.merit_by_department.departments:
        if dept.average_merit_percent is None or dept.employees_with_merit == 0:
            continue
        departments.append(
            MeritBudgetVariance(
                department=dept.department,
                average_merit_percent=dept.average_merit_percent,
                projected_pool=dept.projected_merit_pool,
                payroll_base=dept.payroll_base,
                headcount=dept.headcount,
            )
        )

    return MeritBudgetVarianceReport(
        available=True,
        file_average_merit=file_avg,
        projected_merit_pool=file_pool,
        payroll_base=merit_calc.payroll_base,
        departments=departments,
        disclaimer=(
            "Compare your target merit % (in Overview) to the file average and department pools. "
            "Positive variance means uploaded merit exceeds your target envelope."
        ),
    )


def _normalize_performance(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip().lower()
    if not text or text in {"nan", "none", "n/a", "na"}:
        return None
    return text


def _performance_tier(value: str) -> str | None:
    if value in PERFORMANCE_LOW_KEYWORDS or any(k in value for k in ("does not meet", "needs improvement")):
        return "low"
    if value in PERFORMANCE_HIGH_KEYWORDS or "exceed" in value:
        return "high"
    return "mid"


def build_performance_merit_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    range_penetration: list[Any],
) -> PerformanceMeritReport:
    rating_col = mapping.get("performance_rating")
    if not rating_col or rating_col not in df.columns:
        return PerformanceMeritReport(
            available=False,
            disclaimer="Map a Performance Rating column to check merit vs performance alignment.",
        )

    merit_by_row = {employee.row_number: employee for employee in range_penetration}
    flags: list[PerformanceMeritFlag] = []
    merits = [
        employee.merit_increase
        for employee in range_penetration
        if employee.merit_increase is not None
    ]
    if not merits:
        return PerformanceMeritReport(available=False)

    file_avg_merit = sum(merits) / len(merits)

    for index, row in df.iterrows():
        row_number = int(index) + 2
        employee = merit_by_row.get(row_number)
        if employee is None or employee.merit_increase is None:
            continue
        rating_raw = _normalize_performance(row.get(rating_col))
        if rating_raw is None:
            continue
        tier = _performance_tier(rating_raw)
        merit = employee.merit_increase

        if tier == "low" and merit > file_avg_merit + 0.5:
            flags.append(
                PerformanceMeritFlag(
                    row_number=row_number,
                    employee_id=employee.employee_id,
                    employee_name=employee.employee_name,
                    department=employee.department,
                    job_level=employee.job_level,
                    performance_rating=rating_raw,
                    merit_increase=merit,
                    file_average_merit=round(file_avg_merit, 2),
                    flag_type="low_performer_high_merit",
                    reason=(
                        f"Performance rating '{rating_raw}' with merit {merit}% above file average "
                        f"({file_avg_merit:.1f}%)."
                    ),
                )
            )
        elif tier == "high" and merit < file_avg_merit - 0.5 and merit <= 0.5:
            flags.append(
                PerformanceMeritFlag(
                    row_number=row_number,
                    employee_id=employee.employee_id,
                    employee_name=employee.employee_name,
                    department=employee.department,
                    job_level=employee.job_level,
                    performance_rating=rating_raw,
                    merit_increase=merit,
                    file_average_merit=round(file_avg_merit, 2),
                    flag_type="high_performer_low_merit",
                    reason=(
                        f"Performance rating '{rating_raw}' with merit {merit}% below file average "
                        f"({file_avg_merit:.1f}%)."
                    ),
                )
            )

    return PerformanceMeritReport(
        available=True,
        flags=flags,
        disclaimer=(
            "Performance × merit checks compare uploaded ratings to merit increases. "
            "Rating scales vary by company — review flags with your performance framework."
        ),
    )
