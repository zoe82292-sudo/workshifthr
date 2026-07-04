from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ColumnMapping(BaseModel):
    employee_id: str | None = None
    employee_name: str | None = None
    salary: str | None = None
    range_min: str | None = None
    range_max: str | None = None
    range_midpoint: str | None = None
    job_level: str | None = None
    department: str | None = None
    manager_id: str | None = None
    bonus_target: str | None = None
    effective_date: str | None = None
    hire_date: str | None = None
    merit_increase: str | None = None
    promotion_increase: str | None = None
    equity_grant: str | None = None
    gender: str | None = None
    race_ethnicity: str | None = None


class AnalysisOptions(BaseModel):
    merit_iqr_multiplier: float = Field(default=1.5, ge=0.5, le=5.0)


class EmployeeRecord(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None
    salary: float | None = None
    range_min: float | None = None
    range_max: float | None = None
    job_level: str | None = None
    department: str | None = None
    range_penetration: float | None = None
    penetration_band: str | None = None
    compa_ratio: float | None = None
    merit_increase: float | None = None
    gap_to_minimum: float | None = None
    missing_fields: list[str] = Field(default_factory=list)


class CompaRatioRecord(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None
    salary: float
    range_midpoint: float
    compa_ratio: float


class ExecutiveSummary(BaseModel):
    headline: str
    bullets: list[str]
    risk_level: str


class CostMetrics(BaseModel):
    employees_below_minimum: int
    total_gap_to_minimum: float
    average_gap_to_minimum: float
    employees_above_maximum: int
    total_above_maximum: float


class MeritCalculator(BaseModel):
    employees_with_merit_data: int
    average_merit_percent: float | None = None
    projected_merit_pool: float
    payroll_base: float


class BudgetImpact(BaseModel):
    cost_to_minimum: float
    projected_merit_pool: float
    total_budget_impact: float
    note: str


class CompaRatioSummary(BaseModel):
    average_compa_ratio: float | None = None
    below_90_percent: int = 0
    between_90_and_110: int = 0
    above_110_percent: int = 0


class AnalysisInsights(BaseModel):
    executive_summary: ExecutiveSummary
    cost_metrics: CostMetrics
    budget_impact: BudgetImpact
    merit_calculator: MeritCalculator
    compa_ratio: CompaRatioSummary


class DuplicateGroup(BaseModel):
    employee_id: str
    count: int
    rows: list[int]


class CompressionIssue(BaseModel):
    issue_type: str
    description: str
    lower_level: str | None = None
    higher_level: str | None = None
    lower_salary: float | None = None
    higher_salary: float | None = None
    employee_id: str | None = None
    employee_name: str | None = None
    row_number: int | None = None


class ManagerBelowReportIssue(BaseModel):
    row_number: int
    manager_id: str
    manager_name: str | None = None
    manager_salary: float
    report_id: str
    report_name: str | None = None
    report_salary: float
    pay_gap: float


class MissingBonusTargetRecord(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None


class MissingSalaryRangeRecord(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None
    missing_fields: list[str] = Field(default_factory=list)


class InvalidEffectiveDateRecord(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None
    effective_date: str | None = None
    reason: str


class OutlierMeritIncreaseRecord(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None
    merit_increase: float
    reason: str


class NewHireMeritFlag(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None
    hire_date: str | None = None
    tenure_days: int | None = None
    merit_increase: float | None = None
    reason: str


class UnusualCompChangeRecord(BaseModel):
    row_number: int
    employee_id: str | None = None
    employee_name: str | None = None
    change_type: str
    value_percent: float
    reason: str


class DemographicGroupStats(BaseModel):
    dimension: str
    group_name: str
    headcount: int
    median_salary: float | None = None
    mean_salary: float | None = None
    median_compa_ratio: float | None = None
    workforce_percent: float = 0
    suppressed: bool = False


class PayEquityGap(BaseModel):
    dimension: str
    higher_paid_group: str
    lower_paid_group: str
    higher_median: float
    lower_median: float
    gap_amount: float
    gap_percent: float | None = None
    scope: str


class LevelPayEquityBreakdown(BaseModel):
    job_level: str
    headcount: int
    gender_groups: list[DemographicGroupStats] = Field(default_factory=list)
    race_groups: list[DemographicGroupStats] = Field(default_factory=list)
    gender_gaps: list[PayEquityGap] = Field(default_factory=list)
    race_gaps: list[PayEquityGap] = Field(default_factory=list)


class PayEquityReport(BaseModel):
    available: bool = False
    gender_groups: list[DemographicGroupStats] = Field(default_factory=list)
    race_groups: list[DemographicGroupStats] = Field(default_factory=list)
    gender_gaps: list[PayEquityGap] = Field(default_factory=list)
    race_gaps: list[PayEquityGap] = Field(default_factory=list)
    level_breakdowns: list[LevelPayEquityBreakdown] = Field(default_factory=list)
    employees_missing_gender: int = 0
    employees_missing_race: int = 0
    disclaimer: str = ""


class AnalysisSummary(BaseModel):
    total_rows: int
    valid_rows: int
    below_minimum: int
    above_maximum: int
    duplicate_ids: int
    missing_data: int
    compression_issues: int
    average_penetration: float | None = None
    managers_below_reports: int = 0
    missing_bonus_targets: int = 0
    missing_salary_ranges: int = 0
    invalid_effective_dates: int = 0
    outlier_merit_increases: int = 0
    new_hire_merit_flags: int = 0
    unusual_comp_changes: int = 0
    pay_equity_gaps: int = 0


class AnalysisResult(BaseModel):
    summary: AnalysisSummary
    column_mapping: ColumnMapping
    detected_columns: list[str]
    missing_required_columns: list[str]
    below_minimum: list[EmployeeRecord]
    above_maximum: list[EmployeeRecord]
    duplicate_ids: list[DuplicateGroup]
    range_penetration: list[EmployeeRecord]
    compression: list[CompressionIssue]
    missing_data: list[EmployeeRecord]
    managers_below_reports: list[ManagerBelowReportIssue]
    missing_bonus_targets: list[MissingBonusTargetRecord]
    missing_salary_ranges: list[MissingSalaryRangeRecord]
    invalid_effective_dates: list[InvalidEffectiveDateRecord]
    outlier_merit_increases: list[OutlierMeritIncreaseRecord]
    new_hire_merit_flags: list[NewHireMeritFlag] = Field(default_factory=list)
    unusual_comp_changes: list[UnusualCompChangeRecord] = Field(default_factory=list)
    compa_ratios: list[CompaRatioRecord]
    pay_equity: PayEquityReport
    insights: AnalysisInsights
    warnings: list[str] = Field(default_factory=list)


class PreviewResponse(BaseModel):
    columns: list[str]
    suggested_mapping: ColumnMapping
    preview_rows: list[dict[str, Any]]
    sheet_names: list[str]
