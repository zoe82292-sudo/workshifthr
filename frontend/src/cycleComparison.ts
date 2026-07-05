import type { AnalysisResult } from "./types";

export type CycleComparisonMetric = {
  label: string;
  current: number;
  prior: number;
  delta: number;
  format?: "number" | "percent" | "currency";
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
  const metricDefs: Array<{
    label: string;
    pick: (r: AnalysisResult) => number;
    format?: CycleComparisonMetric["format"];
  }> = [
    { label: "Review queue items", pick: (r) => r.summary.review_queue_items ?? r.review_queue?.total_items ?? 0 },
    { label: "Below minimum", pick: (r) => r.summary.below_minimum },
    { label: "Above maximum", pick: (r) => r.summary.above_maximum },
    { label: "Duplicate IDs", pick: (r) => r.summary.duplicate_ids },
    { label: "Compression issues", pick: (r) => r.summary.compression_issues },
    { label: "Managers below reports", pick: (r) => r.summary.managers_below_reports },
    { label: "Merit matrix flags", pick: (r) => r.summary.merit_matrix_flags ?? 0 },
    { label: "Peer spread flags", pick: (r) => r.summary.peer_spread_flags ?? 0 },
    { label: "Outlier merit increases", pick: (r) => r.summary.outlier_merit_increases },
    {
      label: "Average compa-ratio",
      pick: (r) => r.insights.compa_ratio.average_compa_ratio ?? 0,
      format: "percent",
    },
    {
      label: "Projected merit pool",
      pick: (r) => r.insights.merit_calculator.projected_merit_pool,
      format: "currency",
    },
    {
      label: "File average merit %",
      pick: (r) => r.insights.merit_calculator.average_merit_percent ?? 0,
      format: "percent",
    },
  ];

  const metrics = metricDefs.map(({ label, pick, format }) => {
    const currentValue = pick(current);
    const priorValue = pick(prior);
    return {
      label,
      current: currentValue,
      prior: priorValue,
      delta: currentValue - priorValue,
      format,
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

export function formatComparisonValue(value: number, format?: CycleComparisonMetric["format"]) {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return String(value);
}
