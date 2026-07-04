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
      range_midpoint: null,
      job_level: "Job Level",
      department: "Department",
      manager_id: "Manager ID",
      bonus_target: "Bonus Target",
      effective_date: "Effective Date",
      hire_date: "Hire Date",
      merit_increase: "Merit Increase %",
      promotion_increase: "Promotion Increase %",
      equity_grant: "Equity Grant %",
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
    new_hire_merit_flags: [
      {
        row_number: 10,
        employee_id: "E009",
        employee_name: "Hugo Silva",
        hire_date: "2026-05-01",
        tenure_days: 63,
        merit_increase: 18,
        reason:
          "Employee hired within 90 days has a 18% merit increase — verify eligibility.",
      },
    ],
    unusual_comp_changes: [
      {
        row_number: 12,
        employee_id: "E011",
        employee_name: "Jack Reed",
        change_type: "equity",
        value_percent: 75,
        reason:
          "Unusually high equity change outside the expected range (-10.0% to 30.0%).",
      },
      {
        row_number: 10,
        employee_id: "E009",
        employee_name: "Hugo Silva",
        change_type: "promotion",
        value_percent: 35,
        reason:
          "Unusually high promotion change outside the expected range (4.5% to 16.5%).",
      },
    ],
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
