import { MARKETING_DEMO_DATA } from "./marketingDemoData";
import type { AnalysisResult } from "../types";

/** Bundled demo used when /api/demo-analysis is unavailable (e.g. sample file missing in deploy). */
export function getBundledDemoAnalysis(): AnalysisResult {
  const { summary, below_minimum, insights } = MARKETING_DEMO_DATA;

  return {
    summary,
    column_mapping: {
      employee_id: "Employee ID",
      employee_name: "Employee Name",
      salary: "Salary",
      range_min: "Range Min",
      range_max: "Range Max",
      job_level: "Job Level",
      department: "Department",
      manager_id: "Manager ID",
      bonus_target: "Bonus Target",
      effective_date: "Effective Date",
      merit_increase: "Merit Increase %",
      gender: "Gender",
      race_ethnicity: "Race/Ethnicity",
    },
    detected_columns: [],
    missing_required_columns: [],
    below_minimum,
    above_maximum: [],
    duplicate_ids: [],
    range_penetration: [],
    compression: [],
    missing_data: [],
    managers_below_reports: [],
    missing_bonus_targets: [],
    missing_salary_ranges: [],
    invalid_effective_dates: [],
    outlier_merit_increases: [],
    compa_ratios: [],
    pay_equity: {
      available: true,
      gender_groups: [],
      race_groups: [],
      gender_gaps: [
        {
          dimension: "gender",
          higher_paid_group: "Male",
          lower_paid_group: "Female",
          higher_median: 103500,
          lower_median: 95000,
          gap_amount: 8500,
          gap_percent: 8.9,
          scope: "Overall",
        },
      ],
      race_gaps: [
        {
          dimension: "race_ethnicity",
          higher_paid_group: "White",
          lower_paid_group: "Hispanic/Latino",
          higher_median: 101000,
          lower_median: 92000,
          gap_amount: 9000,
          gap_percent: 9.8,
          scope: "Overall",
        },
      ],
      level_breakdowns: [],
      employees_missing_gender: 0,
      employees_missing_race: 0,
      disclaimer:
        "Pay equity views are decision support only — not a legal pay equity audit. Review outliers with business context.",
    },
    insights,
    warnings: [],
  };
}
