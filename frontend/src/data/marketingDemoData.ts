import type { AnalysisInsights, AnalysisSummary, EmployeeRecord } from "../types";

export interface MarketingPreviewData {
  summary: AnalysisSummary;
  below_minimum: EmployeeRecord[];
  insights: AnalysisInsights;
}

/** Snapshot from sample-data/compensation-sample.csv — stable for marketing screenshots. */
export const MARKETING_DEMO_DATA: MarketingPreviewData = {
  summary: {
    total_rows: 20,
    valid_rows: 18,
    below_minimum: 3,
    above_maximum: 1,
    duplicate_ids: 1,
    missing_data: 2,
    compression_issues: 4,
    average_penetration: 22.3,
    managers_below_reports: 2,
    missing_bonus_targets: 1,
    missing_salary_ranges: 1,
    invalid_effective_dates: 2,
    outlier_merit_increases: 1,
    new_hire_merit_flags: 0,
    unusual_comp_changes: 0,
    pay_equity_gaps: 2,
  },
  below_minimum: [
    {
      row_number: 4,
      employee_id: "E003",
      employee_name: "Carla Diaz",
      salary: 78000,
      range_min: 85000,
      range_max: 100000,
      job_level: "2",
      department: "Product",
      range_penetration: -46.7,
      penetration_band: "below_range",
      compa_ratio: 84.3,
      merit_increase: 2.5,
      gap_to_minimum: 7000,
      missing_fields: [],
    },
    {
      row_number: 8,
      employee_id: "E007",
      employee_name: "Fiona Ng",
      salary: 104000,
      range_min: 105000,
      range_max: 130000,
      job_level: "4",
      department: "Sales",
      range_penetration: -4,
      penetration_band: "below_range",
      compa_ratio: 88.5,
      merit_increase: 3.8,
      gap_to_minimum: 1000,
      missing_fields: [],
    },
    {
      row_number: 9,
      employee_id: "E008",
      employee_name: "Grace Kim",
      salary: 82000,
      range_min: 85000,
      range_max: 100000,
      job_level: "2",
      department: "Product",
      range_penetration: -20,
      penetration_band: "below_range",
      compa_ratio: 88.6,
      merit_increase: 3,
      gap_to_minimum: 3000,
      missing_fields: [],
    },
  ],
  insights: {
    executive_summary: {
      headline: "11 compensation issues flagged for review.",
      bullets: [
        "This analysis covers 18 employees. 2 rows were excluded due to incomplete data.",
        "3 employees are below range minimum, requiring $11,000 to reach the range floor.",
        "4 salary compression patterns may create internal equity risk.",
        "Gender median pay gap: Male median is 8.9% above Female ($8,500 difference).",
      ],
      risk_level: "high",
    },
    cost_metrics: {
      employees_below_minimum: 3,
      total_gap_to_minimum: 11000,
      average_gap_to_minimum: 3666.67,
      employees_above_maximum: 1,
      total_above_maximum: 2000,
    },
    budget_impact: {
      cost_to_minimum: 11000,
      projected_merit_pool: 76156,
      total_budget_impact: 87156,
      note: "Total budget impact combines one-time pay adjustments to reach range minimums plus the projected annual merit pool from uploaded merit increase data.",
    },
    merit_calculator: {
      employees_with_merit_data: 18,
      average_merit_percent: 4.39,
      projected_merit_pool: 76156,
      payroll_base: 1785000,
    },
    compa_ratio: {
      average_compa_ratio: 94.6,
      below_90_percent: 3,
      between_90_and_110: 14,
      above_110_percent: 1,
    },
  },
};
