import type { AnalysisInsights, MeritScenario } from "./types";

const DEFAULT_REFERENCE_MERIT_PERCENT = 3.5;

function poolAtPercent(payrollBase: number, meritPercent: number) {
  return Math.round((payrollBase * meritPercent) / 100);
}

function scenarioPercents(referencePercent: number) {
  const candidates = [
    Math.round((referencePercent - 0.5) * 10) / 10,
    Math.round(referencePercent * 10) / 10,
    Math.round((referencePercent + 0.5) * 10) / 10,
  ];
  const unique: number[] = [];
  for (const percent of candidates) {
    if (percent < 0) continue;
    if (!unique.includes(percent)) unique.push(percent);
  }
  return unique.length > 0 ? unique : [DEFAULT_REFERENCE_MERIT_PERCENT];
}

export function resolveMeritScenario(insights: AnalysisInsights): MeritScenario {
  if (insights.merit_scenario) {
    return insights.merit_scenario;
  }

  const referencePercent =
    insights.merit_calculator.average_merit_percent ?? DEFAULT_REFERENCE_MERIT_PERCENT;
  const referencePool = poolAtPercent(insights.merit_calculator.payroll_base, referencePercent);
  const uploadedPool =
    insights.merit_calculator.employees_with_merit_data > 0
      ? insights.merit_calculator.projected_merit_pool
      : null;

  return {
    cost_to_minimum: insights.cost_metrics.total_gap_to_minimum,
    employees_below_minimum: insights.cost_metrics.employees_below_minimum,
    payroll_base: insights.merit_calculator.payroll_base,
    reference_merit_percent: referencePercent,
    reference_merit_pool: referencePool,
    total_exposure: insights.cost_metrics.total_gap_to_minimum + referencePool,
    uploaded_merit_pool: uploadedPool,
    scenarios: scenarioPercents(referencePercent).map((merit_percent) => ({
      merit_percent,
      projected_pool: poolAtPercent(insights.merit_calculator.payroll_base, merit_percent),
    })),
  };
}

export function poolForMeritPercent(insights: AnalysisInsights, meritPercent: number) {
  return poolAtPercent(insights.merit_calculator.payroll_base, meritPercent);
}
