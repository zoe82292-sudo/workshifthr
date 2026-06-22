export interface ColumnMapping {
  employee_id: string | null;
  employee_name: string | null;
  salary: string | null;
  range_min: string | null;
  range_max: string | null;
  job_level: string | null;
  department: string | null;
  manager_id: string | null;
  bonus_target: string | null;
  effective_date: string | null;
  merit_increase: string | null;
}

export interface EmployeeRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  salary: number | null;
  range_min: number | null;
  range_max: number | null;
  job_level: string | null;
  department: string | null;
  range_penetration: number | null;
  penetration_band: string | null;
  compa_ratio: number | null;
  merit_increase: number | null;
  gap_to_minimum: number | null;
  missing_fields: string[];
}

export interface CompaRatioRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  salary: number;
  range_midpoint: number;
  compa_ratio: number;
}

export interface ExecutiveSummary {
  headline: string;
  bullets: string[];
  risk_level: string;
}

export interface CostMetrics {
  employees_below_minimum: number;
  total_gap_to_minimum: number;
  average_gap_to_minimum: number;
  employees_above_maximum: number;
  total_above_maximum: number;
}

export interface MeritCalculator {
  employees_with_merit_data: number;
  average_merit_percent: number | null;
  projected_merit_pool: number;
  payroll_base: number;
}

export interface BudgetImpact {
  cost_to_minimum: number;
  projected_merit_pool: number;
  total_budget_impact: number;
  note: string;
}

export interface CompaRatioSummary {
  average_compa_ratio: number | null;
  below_90_percent: number;
  between_90_and_110: number;
  above_110_percent: number;
}

export interface AnalysisInsights {
  executive_summary: ExecutiveSummary;
  cost_metrics: CostMetrics;
  budget_impact: BudgetImpact;
  merit_calculator: MeritCalculator;
  compa_ratio: CompaRatioSummary;
}

export interface DuplicateGroup {
  employee_id: string;
  count: number;
  rows: number[];
}

export interface CompressionIssue {
  issue_type: string;
  description: string;
  lower_level?: string | null;
  higher_level?: string | null;
  lower_salary?: number | null;
  higher_salary?: number | null;
  employee_id?: string | null;
  employee_name?: string | null;
  row_number?: number | null;
}

export interface ManagerBelowReportIssue {
  row_number: number;
  manager_id: string;
  manager_name: string | null;
  manager_salary: number;
  report_id: string;
  report_name: string | null;
  report_salary: number;
  pay_gap: number;
}

export interface MissingBonusTargetRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
}

export interface MissingSalaryRangeRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  missing_fields: string[];
}

export interface InvalidEffectiveDateRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  effective_date: string | null;
  reason: string;
}

export interface OutlierMeritIncreaseRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  merit_increase: number;
  reason: string;
}

export interface AnalysisSummary {
  total_rows: number;
  valid_rows: number;
  below_minimum: number;
  above_maximum: number;
  duplicate_ids: number;
  missing_data: number;
  compression_issues: number;
  average_penetration: number | null;
  managers_below_reports: number;
  missing_bonus_targets: number;
  missing_salary_ranges: number;
  invalid_effective_dates: number;
  outlier_merit_increases: number;
}

export interface AnalysisResult {
  summary: AnalysisSummary;
  column_mapping: ColumnMapping;
  detected_columns: string[];
  missing_required_columns: string[];
  below_minimum: EmployeeRecord[];
  above_maximum: EmployeeRecord[];
  duplicate_ids: DuplicateGroup[];
  range_penetration: EmployeeRecord[];
  compression: CompressionIssue[];
  missing_data: EmployeeRecord[];
  managers_below_reports: ManagerBelowReportIssue[];
  missing_bonus_targets: MissingBonusTargetRecord[];
  missing_salary_ranges: MissingSalaryRangeRecord[];
  invalid_effective_dates: InvalidEffectiveDateRecord[];
  outlier_merit_increases: OutlierMeritIncreaseRecord[];
  compa_ratios: CompaRatioRecord[];
  insights: AnalysisInsights;
  warnings: string[];
}

export interface PreviewResponse {
  columns: string[];
  suggested_mapping: ColumnMapping;
  preview_rows: Record<string, string>[];
  sheet_names: string[];
}

export type AnalysisTab =
  | "below_minimum"
  | "above_maximum"
  | "duplicate_ids"
  | "range_penetration"
  | "compression"
  | "managers_below_reports"
  | "missing_bonus_targets"
  | "missing_salary_ranges"
  | "invalid_effective_dates"
  | "outlier_merit_increases"
  | "compa_ratio"
  | "missing_data";

export const PENETRATION_BAND_LABELS: Record<string, string> = {
  below_range: "Below range",
  bottom_quartile: "0–25%",
  mid_range: "25–75%",
  top_quartile: "75–100%",
  above_range: "Above range",
};
