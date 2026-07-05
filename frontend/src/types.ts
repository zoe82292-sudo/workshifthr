export interface ColumnMapping {
  employee_id: string | null;
  employee_name: string | null;
  salary: string | null;
  range_min: string | null;
  range_max: string | null;
  range_midpoint: string | null;
  job_level: string | null;
  department: string | null;
  location: string | null;
  manager_id: string | null;
  bonus_target: string | null;
  effective_date: string | null;
  hire_date: string | null;
  merit_increase: string | null;
  promotion_increase: string | null;
  equity_grant: string | null;
  gender: string | null;
  race_ethnicity: string | null;
  employee_type: string | null;
  pay_zone: string | null;
  geo_differential: string | null;
  currency: string | null;
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

export interface NewHireMeritFlag {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  hire_date: string | null;
  tenure_days: number | null;
  merit_increase: number | null;
  reason: string;
}

export interface MeritCompaFlag {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  compa_ratio: number;
  merit_increase: number;
  file_average_merit: number;
  flag_type: string;
  reason: string;
}

export interface UnusualCompChangeRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  change_type: string;
  value_percent: number;
  reason: string;
}

export interface EquityGrantRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  equity_grant: number;
  is_outlier: boolean;
  reason: string | null;
}

export interface AnalysisSummary {
  total_rows: number;
  valid_rows: number;
  below_minimum: number;
  above_maximum: number;
  new_hires_below_range?: number;
  duplicate_ids: number;
  missing_data: number;
  compression_issues: number;
  average_penetration: number | null;
  managers_below_reports: number;
  missing_bonus_targets: number;
  missing_salary_ranges: number;
  invalid_effective_dates: number;
  outlier_merit_increases: number;
  new_hire_merit_flags: number;
  merit_compa_flags?: number;
  unusual_comp_changes: number;
  equity_grant_outliers: number;
  pay_equity_gaps: number;
  tenure_pay_flags: number;
  location_pay_gaps: number;
  bonus_target_outliers?: number;
  peer_spread_flags?: number;
  post_merit_compa_rows?: number;
  merit_matrix_flags?: number;
  range_structure_issues?: number;
  new_hire_placement_flags?: number;
  geo_pay_policy_flags?: number;
  midpoint_progression_issues?: number;
}

export interface PayEquityGap {
  dimension: string;
  higher_paid_group: string;
  lower_paid_group: string;
  higher_median: number;
  lower_median: number;
  gap_amount: number;
  gap_percent: number | null;
  scope: string;
}

export interface DemographicGroupStats {
  dimension: string;
  group_name: string;
  headcount: number;
  median_salary: number | null;
  mean_salary: number | null;
  median_compa_ratio: number | null;
  workforce_percent: number;
  suppressed: boolean;
}

export interface LevelPayEquityBreakdown {
  job_level: string;
  headcount: number;
  gender_groups: DemographicGroupStats[];
  race_groups: DemographicGroupStats[];
  gender_gaps: PayEquityGap[];
  race_gaps: PayEquityGap[];
}

export interface PayEquityReport {
  available: boolean;
  gender_groups: DemographicGroupStats[];
  race_groups: DemographicGroupStats[];
  gender_gaps: PayEquityGap[];
  race_gaps: PayEquityGap[];
  level_breakdowns: LevelPayEquityBreakdown[];
  employees_missing_gender: number;
  employees_missing_race: number;
  disclaimer: string;
}

export interface TenurePayFlag {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  hire_date: string | null;
  tenure_years: number;
  salary: number;
  flag_type: string;
  reason: string;
}

export interface TenureBandStats {
  band_label: string;
  headcount: number;
  median_salary: number | null;
  median_tenure_years: number | null;
  median_compa_ratio: number | null;
}

export interface TenureEmployeeRow {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  hire_date: string | null;
  tenure_days: number;
  tenure_years: number;
  tenure_band: string;
  salary: number | null;
  job_level: string | null;
  department: string | null;
  location: string | null;
  compa_ratio: number | null;
}

export interface TenureReport {
  available: boolean;
  bands: TenureBandStats[];
  employees: TenureEmployeeRow[];
  flags: TenurePayFlag[];
  employees_missing_hire_date: number;
  disclaimer: string;
}

export interface LevelLocationBreakdown {
  job_level: string;
  headcount: number;
  location_groups: DemographicGroupStats[];
  location_gaps: PayEquityGap[];
}

export interface LocationPayReport {
  available: boolean;
  location_groups: DemographicGroupStats[];
  location_gaps: PayEquityGap[];
  level_breakdowns: LevelLocationBreakdown[];
  employees_missing_location: number;
  disclaimer: string;
}

export interface DepartmentMeritStats {
  department: string;
  headcount: number;
  employees_with_merit: number;
  average_merit_percent: number | null;
  projected_merit_pool: number;
  payroll_base: number;
}

export interface MeritByDepartmentReport {
  available: boolean;
  departments: DepartmentMeritStats[];
  file_average_merit: number | null;
  disclaimer: string;
}

export interface BonusTargetOutlierRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  job_level: string | null;
  bonus_target: number;
  level_median_bonus: number | null;
  reason: string;
}

export interface BonusTargetReview {
  available: boolean;
  outliers: BonusTargetOutlierRecord[];
  disclaimer: string;
}

export interface PostMeritCompaRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  job_level: string | null;
  salary: number;
  merit_increase: number;
  current_compa_ratio: number;
  projected_compa_ratio: number;
  compa_change: number;
  projected_salary: number;
}

export interface PostMeritCompaReport {
  available: boolean;
  employees: PostMeritCompaRecord[];
  average_current_compa: number | null;
  average_projected_compa: number | null;
  employees_below_90_after: number;
  employees_above_110_after: number;
  disclaimer: string;
}

export interface PeerSpreadFlag {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  job_level: string | null;
  department: string | null;
  salary: number;
  group_min_salary: number;
  group_max_salary: number;
  spread_percent: number;
  headcount: number;
  reason: string;
}

export interface PeerSpreadReport {
  available: boolean;
  flags: PeerSpreadFlag[];
  spread_threshold: number;
  disclaimer: string;
}

export interface MeritMatrixBand {
  label: string;
  compa_min: number;
  compa_max: number;
  merit_min: number;
  merit_max: number;
}

export interface MeritMatrixFlag {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  job_level: string | null;
  compa_ratio: number;
  merit_increase: number;
  matrix_band: string;
  expected_merit_min: number;
  expected_merit_max: number;
  reason: string;
}

export interface MeritMatrixReport {
  available: boolean;
  flags: MeritMatrixFlag[];
  bands: MeritMatrixBand[];
  disclaimer: string;
}

export interface RangeStructureIssue {
  issue_type: string;
  job_level: string;
  description: string;
  related_level?: string | null;
  range_min?: number | null;
  range_mid?: number | null;
  range_max?: number | null;
}

export interface LevelRangeSummary {
  job_level: string;
  range_min: number;
  range_mid: number | null;
  range_max: number;
  range_width: number;
  range_width_percent: number | null;
  employee_count: number;
}

export interface RangeStructureReport {
  available: boolean;
  issues: RangeStructureIssue[];
  level_ranges: LevelRangeSummary[];
  disclaimer: string;
}

export interface GroupCompaStats {
  group_type: string;
  group_key: string;
  job_level?: string | null;
  department?: string | null;
  headcount: number;
  average_compa: number | null;
  median_compa: number | null;
  average_penetration: number | null;
  below_90: number;
  between_90_110: number;
  above_110: number;
}

export interface CompaPenetrationSummary {
  available: boolean;
  by_level: GroupCompaStats[];
  by_department: GroupCompaStats[];
  by_level_department: GroupCompaStats[];
  disclaimer: string;
}

export interface TotalCashCompRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  job_level: string | null;
  base_salary: number;
  bonus_target_percent: number;
  target_bonus_amount: number;
  total_cash_comp: number;
  base_compa_ratio: number | null;
  tcc_compa_ratio: number | null;
}

export interface TotalCashCompReport {
  available: boolean;
  employees: TotalCashCompRecord[];
  average_tcc: number | null;
  disclaimer: string;
}

export interface NewHirePlacementRecord {
  row_number: number;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  job_level: string | null;
  hire_date: string | null;
  tenure_days: number;
  salary: number;
  range_min: number;
  range_max: number;
  compa_ratio: number | null;
  range_penetration: number | null;
  below_minimum: boolean;
  placement_issue: string;
}

export interface NewHirePlacementReport {
  available: boolean;
  employees: NewHirePlacementRecord[];
  lookback_days: number;
  below_range_count: number;
  disclaimer: string;
}

export interface GeoPayPolicyFlag {
  row_number: number;
  employee_id: string | null;
  pay_zone: string | null;
  location: string | null;
  expected_differential: number | null;
  actual_differential: number | null;
  salary: number;
  reason: string;
}

export interface GeoZoneMedian {
  pay_zone: string;
  median_differential: number;
}

export interface GeoPayPolicyReport {
  available: boolean;
  flags: GeoPayPolicyFlag[];
  zone_medians: GeoZoneMedian[];
  disclaimer: string;
}

export interface CurrencyGroupStats {
  currency: string;
  headcount: number;
  median_salary: number | null;
  median_salary_usd: number | null;
  fx_rate_to_usd: number;
}

export interface CurrencyReport {
  available: boolean;
  currencies: CurrencyGroupStats[];
  multi_currency: boolean;
  disclaimer: string;
}

export interface EmployeeTypeCount {
  employee_type: string;
  headcount: number;
  excluded_from_aggregates: boolean;
}

export interface EmployeeTypeReport {
  available: boolean;
  types: EmployeeTypeCount[];
  excluded_types: string[];
  excluded_count: number;
  disclaimer: string;
}

export interface LevelMidpointRow {
  job_level: string;
  range_mid: number;
  sort_rank: number;
}

export interface MidpointProgressionIssue {
  lower_level: string;
  higher_level: string;
  lower_midpoint: number;
  higher_midpoint: number;
  description: string;
}

export interface MidpointProgressionReport {
  available: boolean;
  issues: MidpointProgressionIssue[];
  level_midpoints: LevelMidpointRow[];
  disclaimer: string;
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
  new_hire_merit_flags: NewHireMeritFlag[];
  merit_compa_flags: MeritCompaFlag[];
  unusual_comp_changes: UnusualCompChangeRecord[];
  equity_grants: EquityGrantRecord[];
  compa_ratios: CompaRatioRecord[];
  pay_equity: PayEquityReport;
  tenure: TenureReport;
  location_pay: LocationPayReport;
  merit_by_department: MeritByDepartmentReport;
  bonus_target_review: BonusTargetReview;
  post_merit_compa: PostMeritCompaReport;
  peer_spread: PeerSpreadReport;
  merit_matrix: MeritMatrixReport;
  range_structure: RangeStructureReport;
  compa_penetration_summary: CompaPenetrationSummary;
  total_cash_comp: TotalCashCompReport;
  new_hire_placement: NewHirePlacementReport;
  geo_pay_policy: GeoPayPolicyReport;
  currency_report: CurrencyReport;
  employee_type_report: EmployeeTypeReport;
  midpoint_progression: MidpointProgressionReport;
  excluded_employee_ids: string[];
  insights: AnalysisInsights;
  warnings: string[];
}

export interface PreviewResponse {
  columns: string[];
  suggested_mapping: ColumnMapping;
  preview_rows: Record<string, string>[];
  sheet_names: string[];
}

export interface AnalysisHistorySummary {
  id: string;
  file_name: string;
  saved_at: string;
  saved_by: string;
  total_rows: number;
  below_minimum: number;
  risk_level: string;
}

export interface AnalysisHistoryDetail extends AnalysisHistorySummary {
  result: AnalysisResult;
}

export type AnalysisTab =
  | "below_minimum"
  | "above_maximum"
  | "duplicate_ids"
  | "range_penetration"
  | "compression"
  | "peer_spread"
  | "managers_below_reports"
  | "missing_bonus_targets"
  | "missing_salary_ranges"
  | "invalid_effective_dates"
  | "outlier_merit_increases"
  | "new_hire_merit_flags"
  | "merit_compa_flags"
  | "equity_grants"
  | "unusual_comp_changes"
  | "compa_ratio"
  | "post_merit_compa"
  | "merit_matrix"
  | "range_structure"
  | "compa_summary"
  | "total_cash_comp"
  | "new_hire_placement"
  | "geo_pay_policy"
  | "currency_report"
  | "employee_types"
  | "midpoint_progression"
  | "pay_equity"
  | "tenure"
  | "location_pay"
  | "missing_data";

export const PENETRATION_BAND_LABELS: Record<string, string> = {
  below_range: "Below range",
  bottom_quartile: "0–25%",
  mid_range: "25–75%",
  top_quartile: "75–100%",
  above_range: "Above range",
};
