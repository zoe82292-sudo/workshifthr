import type { AnalysisResult } from "./types";

export type CycleComparisonMetric = {
  label: string;
  current: number;
  prior: number;
  delta: number;
};

export type CycleComparisonChange = {
  employee_id: string;
  employee_name: string | null;
  change: "new_below_minimum" | "resolved_below_minimum" | "still_below_minimum";
  current_salary?: number | null;
  prior_salary?: number | null;
};

export type CycleComparison = {
  priorLabel: string;
  metrics: CycleComparisonMetric[];
  employeeChanges: CycleComparisonChange[];
};

function employeeMap(rows: AnalysisResult["below_minimum"]) {
  return new Map(
    rows
      .filter((row) => row.employee_id)
      .map((row) => [row.employee_id as string, row]),
  );
}

export function compareAnalysisResults(
  current: AnalysisResult,
  prior: AnalysisResult,
  priorLabel: string,
): CycleComparison {
  const metricDefs: Array<{ label: string; pick: (r: AnalysisResult) => number }> = [
    { label: "Below minimum", pick: (r) => r.summary.below_minimum },
    { label: "Above maximum", pick: (r) => r.summary.above_maximum },
    { label: "Duplicate IDs", pick: (r) => r.summary.duplicate_ids },
    { label: "Compression issues", pick: (r) => r.summary.compression_issues },
    { label: "Managers below reports", pick: (r) => r.summary.managers_below_reports },
    { label: "Invalid effective dates", pick: (r) => r.summary.invalid_effective_dates },
    { label: "Outlier merit increases", pick: (r) => r.summary.outlier_merit_increases },
    { label: "New-hire merit flags", pick: (r) => r.summary.new_hire_merit_flags ?? 0 },
    { label: "Unusual comp changes", pick: (r) => r.summary.unusual_comp_changes ?? 0 },
  ];

  const metrics = metricDefs.map(({ label, pick }) => {
    const currentValue = pick(current);
    const priorValue = pick(prior);
    return {
      label,
      current: currentValue,
      prior: priorValue,
      delta: currentValue - priorValue,
    };
  });

  const currentBelow = employeeMap(current.below_minimum);
  const priorBelow = employeeMap(prior.below_minimum);
  const employeeChanges: CycleComparisonChange[] = [];

  for (const [employeeId, row] of currentBelow) {
    if (!priorBelow.has(employeeId)) {
      employeeChanges.push({
        employee_id: employeeId,
        employee_name: row.employee_name,
        change: "new_below_minimum",
        current_salary: row.salary,
      });
    } else {
      employeeChanges.push({
        employee_id: employeeId,
        employee_name: row.employee_name,
        change: "still_below_minimum",
        current_salary: row.salary,
        prior_salary: priorBelow.get(employeeId)?.salary,
      });
    }
  }

  for (const [employeeId, row] of priorBelow) {
    if (!currentBelow.has(employeeId)) {
      employeeChanges.push({
        employee_id: employeeId,
        employee_name: row.employee_name,
        change: "resolved_below_minimum",
        prior_salary: row.salary,
      });
    }
  }

  return {
    priorLabel,
    metrics,
    employeeChanges: employeeChanges.sort((a, b) => a.employee_id.localeCompare(b.employee_id)),
  };
}
