from __future__ import annotations

from app.models import (
    AnalysisResult,
    AnalysisInsights,
    BudgetImpact,
    CompaRatioSummary,
    CostMetrics,
    ExecutiveSummary,
    MeritCalculator,
)


def build_insights(result: AnalysisResult) -> AnalysisInsights:
    cost_metrics = _build_cost_metrics(result)
    merit_calculator = _build_merit_calculator(result)
    budget_impact = _build_budget_impact(cost_metrics, merit_calculator)
    compa_ratio = _build_compa_summary(result)
    executive_summary = _build_executive_summary(result, cost_metrics, budget_impact, compa_ratio)

    return AnalysisInsights(
        executive_summary=executive_summary,
        cost_metrics=cost_metrics,
        budget_impact=budget_impact,
        merit_calculator=merit_calculator,
        compa_ratio=compa_ratio,
    )


def _build_cost_metrics(result: AnalysisResult) -> CostMetrics:
    gaps: list[float] = []
    for employee in result.below_minimum:
        if employee.salary is not None and employee.range_min is not None:
            gaps.append(max(employee.range_min - employee.salary, 0))

    above_amounts: list[float] = []
    for employee in result.above_maximum:
        if employee.salary is not None and employee.range_max is not None:
            above_amounts.append(max(employee.salary - employee.range_max, 0))

    total_gap = round(sum(gaps), 2)
    average_gap = round(total_gap / len(gaps), 2) if gaps else 0.0

    return CostMetrics(
        employees_below_minimum=len(gaps),
        total_gap_to_minimum=total_gap,
        average_gap_to_minimum=average_gap,
        employees_above_maximum=len(above_amounts),
        total_above_maximum=round(sum(above_amounts), 2),
    )


def _build_merit_calculator(result: AnalysisResult) -> MeritCalculator:
    payroll_base = 0.0
    merit_percents: list[float] = []
    merit_pool = 0.0

    for employee in result.range_penetration:
        if employee.salary is None:
            continue
        payroll_base += employee.salary
        if employee.merit_increase is not None:
            merit_percents.append(employee.merit_increase)
            merit_pool += employee.salary * (employee.merit_increase / 100)

    average_merit = round(sum(merit_percents) / len(merit_percents), 2) if merit_percents else None

    return MeritCalculator(
        employees_with_merit_data=len(merit_percents),
        average_merit_percent=average_merit,
        projected_merit_pool=round(merit_pool, 2),
        payroll_base=round(payroll_base, 2),
    )


def _build_budget_impact(
    cost_metrics: CostMetrics,
    merit_calculator: MeritCalculator,
) -> BudgetImpact:
    total = round(cost_metrics.total_gap_to_minimum + merit_calculator.projected_merit_pool, 2)
    return BudgetImpact(
        cost_to_minimum=cost_metrics.total_gap_to_minimum,
        projected_merit_pool=merit_calculator.projected_merit_pool,
        total_budget_impact=total,
        note=(
            "Total budget impact combines one-time pay adjustments to reach range minimums "
            "plus the projected annual merit pool from uploaded merit increase data."
        ),
    )


def _build_compa_summary(result: AnalysisResult) -> CompaRatioSummary:
    ratios: list[float] = []
    below_90 = 0
    between = 0
    above_110 = 0

    for employee in result.compa_ratios:
        ratios.append(employee.compa_ratio)
        if employee.compa_ratio < 90:
            below_90 += 1
        elif employee.compa_ratio <= 110:
            between += 1
        else:
            above_110 += 1

    average = round(sum(ratios) / len(ratios), 1) if ratios else None

    return CompaRatioSummary(
        average_compa_ratio=average,
        below_90_percent=below_90,
        between_90_and_110=between,
        above_110_percent=above_110,
    )


def _build_executive_summary(
    result: AnalysisResult,
    cost_metrics: CostMetrics,
    budget_impact: BudgetImpact,
    compa_ratio: CompaRatioSummary,
) -> ExecutiveSummary:
    summary = result.summary
    bullets: list[str] = []

    bullets.append(
        f"Reviewed {summary.total_rows} rows with {summary.valid_rows} employees ready for comp analysis."
    )

    if summary.below_minimum:
        bullets.append(
            f"{summary.below_minimum} employees are below range minimum, requiring "
            f"${cost_metrics.total_gap_to_minimum:,.0f} to bring them to the range floor."
        )
    else:
        bullets.append("No employees were paid below their assigned range minimum.")

    if summary.above_maximum:
        bullets.append(
            f"{summary.above_maximum} employees exceed their range maximum by a combined "
            f"${cost_metrics.total_above_maximum:,.0f}."
        )

    if summary.duplicate_ids:
        bullets.append(f"{summary.duplicate_ids} duplicate employee IDs need cleanup before payroll processing.")

    if summary.compression_issues:
        bullets.append(f"{summary.compression_issues} salary compression patterns may create internal equity risk.")

    if summary.managers_below_reports:
        bullets.append(
            f"{summary.managers_below_reports} managers are paid below at least one direct report."
        )

    if compa_ratio.average_compa_ratio is not None:
        bullets.append(
            f"Average compa-ratio is {compa_ratio.average_compa_ratio:.1f}% "
            f"({compa_ratio.below_90_percent} employees below 90% of midpoint)."
        )

    if budget_impact.projected_merit_pool > 0:
        bullets.append(
            f"Uploaded merit data implies a projected merit pool of "
            f"${budget_impact.projected_merit_pool:,.0f}."
        )

    issue_count = (
        summary.below_minimum
        + summary.above_maximum
        + summary.duplicate_ids
        + summary.compression_issues
        + summary.managers_below_reports
        + summary.missing_data
    )

    if issue_count >= 8:
        risk = "high"
        headline = "Multiple compensation risks require immediate review."
    elif issue_count >= 3:
        risk = "moderate"
        headline = "Several compensation issues should be addressed this cycle."
    else:
        risk = "low"
        headline = "Compensation file is in relatively strong shape."

    return ExecutiveSummary(
        headline=headline,
        bullets=bullets,
        risk_level=risk,
    )


def empty_insights() -> AnalysisInsights:
    return AnalysisInsights(
        executive_summary=ExecutiveSummary(
            headline="Upload a compensation file to generate an executive summary.",
            bullets=[],
            risk_level="low",
        ),
        cost_metrics=CostMetrics(
            employees_below_minimum=0,
            total_gap_to_minimum=0,
            average_gap_to_minimum=0,
            employees_above_maximum=0,
            total_above_maximum=0,
        ),
        budget_impact=BudgetImpact(
            cost_to_minimum=0,
            projected_merit_pool=0,
            total_budget_impact=0,
            note="No budget impact calculated yet.",
        ),
        merit_calculator=MeritCalculator(
            employees_with_merit_data=0,
            projected_merit_pool=0,
            payroll_base=0,
        ),
        compa_ratio=CompaRatioSummary(),
    )
