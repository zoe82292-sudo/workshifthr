from __future__ import annotations

from app.models import (
    AnalysisResult,
    AnalysisInsights,
    BudgetImpact,
    CompaRatioSummary,
    CostMetrics,
    ExecutiveSummary,
    MeritCalculator,
    MeritScenario,
    MeritScenarioRow,
)

DEFAULT_REFERENCE_MERIT_PERCENT = 3.5


def build_insights(result: AnalysisResult) -> AnalysisInsights:
    cost_metrics = _build_cost_metrics(result)
    merit_calculator = _build_merit_calculator(result)
    budget_impact = _build_budget_impact(cost_metrics, merit_calculator)
    merit_scenario = _build_merit_scenario(cost_metrics, merit_calculator)
    compa_ratio = _build_compa_summary(result)
    executive_summary = _build_executive_summary(result, cost_metrics, budget_impact, compa_ratio)

    return AnalysisInsights(
        executive_summary=executive_summary,
        cost_metrics=cost_metrics,
        budget_impact=budget_impact,
        merit_calculator=merit_calculator,
        merit_scenario=merit_scenario,
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


def _pool_at_percent(payroll_base: float, merit_percent: float) -> float:
    return round(payroll_base * (merit_percent / 100), 2)


def _scenario_percents(reference_percent: float) -> list[float]:
    candidates = [
        round(reference_percent - 0.5, 1),
        round(reference_percent, 1),
        round(reference_percent + 0.5, 1),
    ]
    unique: list[float] = []
    for percent in candidates:
        if percent < 0:
            continue
        if percent not in unique:
            unique.append(percent)
    return unique or [DEFAULT_REFERENCE_MERIT_PERCENT]


def _build_merit_scenario(
    cost_metrics: CostMetrics,
    merit_calculator: MeritCalculator,
) -> MeritScenario:
    reference_percent = (
        merit_calculator.average_merit_percent
        if merit_calculator.average_merit_percent is not None
        else DEFAULT_REFERENCE_MERIT_PERCENT
    )
    reference_pool = _pool_at_percent(merit_calculator.payroll_base, reference_percent)
    uploaded_pool = (
        round(merit_calculator.projected_merit_pool, 2)
        if merit_calculator.employees_with_merit_data > 0
        else None
    )

    return MeritScenario(
        cost_to_minimum=cost_metrics.total_gap_to_minimum,
        employees_below_minimum=cost_metrics.employees_below_minimum,
        payroll_base=merit_calculator.payroll_base,
        reference_merit_percent=reference_percent,
        reference_merit_pool=reference_pool,
        total_exposure=round(cost_metrics.total_gap_to_minimum + reference_pool, 2),
        uploaded_merit_pool=uploaded_pool,
        scenarios=[
            MeritScenarioRow(
                merit_percent=percent,
                projected_pool=_pool_at_percent(merit_calculator.payroll_base, percent),
            )
            for percent in _scenario_percents(reference_percent)
        ],
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


def _plural(count: int, singular: str, plural: str | None = None) -> str:
    if count == 1:
        return singular
    return plural if plural is not None else f"{singular}s"


def _build_executive_summary(
    result: AnalysisResult,
    cost_metrics: CostMetrics,
    budget_impact: BudgetImpact,
    compa_ratio: CompaRatioSummary,
) -> ExecutiveSummary:
    summary = result.summary
    bullets: list[str] = []

    scope = f"This analysis covers {summary.valid_rows} {_plural(summary.valid_rows, 'employee')}."
    skipped_rows = summary.total_rows - summary.valid_rows
    if skipped_rows > 0:
        scope += (
            f" {skipped_rows} {_plural(skipped_rows, 'row')} "
            f"{_plural(skipped_rows, 'was', 'were')} excluded due to incomplete data."
        )
    bullets.append(scope)

    if summary.review_queue_items:
        bullets.insert(
            0,
            f"{summary.review_queue_items} prioritized review queue "
            f"{_plural(summary.review_queue_items, 'item', 'items')} "
            f"({result.review_queue.critical_count} critical, {result.review_queue.high_count} high priority).",
        )

    if summary.below_minimum:
        bullets.append(
            f"{summary.below_minimum} {_plural(summary.below_minimum, 'employee')} "
            f"{_plural(summary.below_minimum, 'is', 'are')} below range minimum, requiring "
            f"${cost_metrics.total_gap_to_minimum:,.0f} to reach the range floor."
        )
        if summary.new_hires_below_range:
            bullets.append(
                f"{summary.new_hires_below_range} "
                f"{_plural(summary.new_hires_below_range, 'employee')} "
                f"hired within the last year {_plural(summary.new_hires_below_range, 'is', 'are')} "
                "still below range minimum — review starting placement."
            )
    else:
        bullets.append("No employees were paid below their assigned range minimum.")

    if summary.above_maximum:
        bullets.append(
            f"{summary.above_maximum} {_plural(summary.above_maximum, 'employee')} "
            f"{_plural(summary.above_maximum, 'exceeds', 'exceed')} "
            f"{_plural(summary.above_maximum, 'their', 'their')} range maximum by a combined "
            f"${cost_metrics.total_above_maximum:,.0f}."
        )

    if summary.duplicate_ids:
        bullets.append(
            f"{summary.duplicate_ids} duplicate employee "
            f"{_plural(summary.duplicate_ids, 'ID', 'IDs')} "
            f"{_plural(summary.duplicate_ids, 'was', 'were')} found in the source file."
        )

    if summary.compression_issues:
        bullets.append(
            f"{summary.compression_issues} salary compression "
            f"{_plural(summary.compression_issues, 'pattern', 'patterns')} "
            "may create internal equity risk."
        )

    if summary.managers_below_reports:
        bullets.append(
            f"{summary.managers_below_reports} "
            f"{_plural(summary.managers_below_reports, 'manager', 'managers')} "
            f"{_plural(summary.managers_below_reports, 'is', 'are')} paid below at least one direct report."
        )

    if summary.equity_grant_outliers:
        bullets.append(
            f"{summary.equity_grant_outliers} "
            f"{_plural(summary.equity_grant_outliers, 'employee', 'employees')} "
            f"{_plural(summary.equity_grant_outliers, 'has', 'have')} an unusually high or low "
            "equity / LTI grant compared to the rest of the file."
        )

    if summary.merit_compa_flags:
        bullets.append(
            f"{summary.merit_compa_flags} "
            f"{_plural(summary.merit_compa_flags, 'employee', 'employees')} "
            f"{_plural(summary.merit_compa_flags, 'has', 'have')} a merit increase that may not "
            "align with compa-ratio positioning — review under-correction and over-rewarding cases."
        )

    if compa_ratio.average_compa_ratio is not None:
        bullets.append(
            f"Average compa-ratio is {compa_ratio.average_compa_ratio:.1f}% "
            f"({compa_ratio.below_90_percent} "
            f"{_plural(compa_ratio.below_90_percent, 'employee')} below 90% of midpoint)."
        )

    if budget_impact.projected_merit_pool > 0:
        bullets.append(
            f"Uploaded merit data implies a projected merit pool of "
            f"${budget_impact.projected_merit_pool:,.0f}."
        )

    if result.merit_by_department.available and len(result.merit_by_department.departments) > 1:
        ranked = sorted(
            [
                dept
                for dept in result.merit_by_department.departments
                if dept.average_merit_percent is not None and dept.employees_with_merit > 0
            ],
            key=lambda dept: dept.average_merit_percent or 0,
            reverse=True,
        )
        if len(ranked) >= 2:
            high = ranked[0]
            low = ranked[-1]
            bullets.append(
                f"Merit by department: {high.department} averages {high.average_merit_percent}% vs "
                f"{low.department} at {low.average_merit_percent}%."
            )

    if result.post_merit_compa.available and result.post_merit_compa.average_projected_compa is not None:
        current = result.post_merit_compa.average_current_compa
        projected = result.post_merit_compa.average_projected_compa
        if current is not None and projected != current:
            bullets.append(
                f"Average compa-ratio moves from {current:.1f}% to {projected:.1f}% after uploaded "
                f"merit increases ({result.post_merit_compa.employees_below_90_after} employees "
                f"would remain below 90%)."
            )

    if summary.peer_spread_flags:
        bullets.append(
            f"{summary.peer_spread_flags} peer pay spread "
            f"{_plural(summary.peer_spread_flags, 'flag', 'flags')} — same level and department "
            "groups with more than 15% pay spread."
        )

    if summary.bonus_target_outliers:
        bullets.append(
            f"{summary.bonus_target_outliers} bonus target "
            f"{_plural(summary.bonus_target_outliers, 'outlier', 'outliers')} vs. same job level."
        )

    if summary.merit_matrix_flags:
        bullets.append(
            f"{summary.merit_matrix_flags} merit increase "
            f"{_plural(summary.merit_matrix_flags, 'flag', 'flags')} outside default compa-ratio matrix bands."
        )

    if summary.range_structure_issues:
        bullets.append(
            f"{summary.range_structure_issues} range structure "
            f"{_plural(summary.range_structure_issues, 'issue', 'issues')} — invalid order, overlap, or unusual width."
        )

    if summary.new_hire_placement_flags:
        bullets.append(
            f"{summary.new_hire_placement_flags} recent "
            f"{_plural(summary.new_hire_placement_flags, 'hire', 'hires')} "
            f"{_plural(summary.new_hire_placement_flags, 'is', 'are')} still below range minimum."
        )

    if summary.geo_pay_policy_flags:
        bullets.append(
            f"{summary.geo_pay_policy_flags} geo differential "
            f"{_plural(summary.geo_pay_policy_flags, 'flag', 'flags')} vs. pay-zone medians."
        )

    if summary.midpoint_progression_issues:
        bullets.append(
            f"{summary.midpoint_progression_issues} midpoint progression "
            f"{_plural(summary.midpoint_progression_issues, 'issue', 'issues')} between adjacent job levels."
        )

    if result.total_cash_comp.available and result.total_cash_comp.average_tcc is not None:
        bullets.append(
            f"Total cash comp (base + target bonus) averages "
            f"${result.total_cash_comp.average_tcc:,.0f} across employees with bonus targets."
        )

    if result.pay_equity.available:
        if result.pay_equity.gender_gaps:
            top_gender_gap = result.pay_equity.gender_gaps[0]
            gap_pct = (
                f"{top_gender_gap.gap_percent:.1f}%"
                if top_gender_gap.gap_percent is not None
                else "N/A"
            )
            bullets.append(
                f"Gender median pay gap: {top_gender_gap.higher_paid_group} median is "
                f"{gap_pct} above {top_gender_gap.lower_paid_group} "
                f"(${top_gender_gap.gap_amount:,.0f} difference)."
            )
        if result.pay_equity.race_gaps:
            top_race_gap = result.pay_equity.race_gaps[0]
            gap_pct = (
                f"{top_race_gap.gap_percent:.1f}%"
                if top_race_gap.gap_percent is not None
                else "N/A"
            )
            bullets.append(
                f"Race/ethnicity median pay gap: {top_race_gap.higher_paid_group} median is "
                f"{gap_pct} above {top_race_gap.lower_paid_group}."
            )
        if not result.pay_equity.gender_gaps and not result.pay_equity.race_gaps:
            bullets.append(
                "Pay equity groups were detected, but no reportable median gaps met the "
                "minimum group size threshold."
            )

    if result.tenure.available and summary.tenure_pay_flags:
        bullets.append(
            f"{summary.tenure_pay_flags} tenure pay "
            f"{_plural(summary.tenure_pay_flags, 'flag', 'flags')} "
            f"{_plural(summary.tenure_pay_flags, 'was', 'were')} found — review short-tenure "
            "high pay and long-tenure low pay cases."
        )

    if result.location_pay.available and summary.location_pay_gaps:
        bullets.append(
            f"{summary.location_pay_gaps} reportable location pay "
            f"{_plural(summary.location_pay_gaps, 'gap', 'gaps')} "
            f"{_plural(summary.location_pay_gaps, 'was', 'were')} detected between offices or cities."
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
        headline = f"{issue_count} compensation issues flagged for review."
    elif issue_count >= 3:
        risk = "moderate"
        headline = f"{issue_count} compensation items warrant review this cycle."
    elif issue_count >= 1:
        risk = "low"
        headline = "One compensation item should be reviewed before finalizing pay decisions."
    else:
        risk = "low"
        headline = "No major compensation issues detected in this file."

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
        merit_scenario=MeritScenario(
            cost_to_minimum=0,
            employees_below_minimum=0,
            payroll_base=0,
            reference_merit_percent=DEFAULT_REFERENCE_MERIT_PERCENT,
            reference_merit_pool=0,
            total_exposure=0,
            scenarios=[],
        ),
        compa_ratio=CompaRatioSummary(),
    )
