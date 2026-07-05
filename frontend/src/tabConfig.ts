import type { AnalysisResult, AnalysisTab } from "./types";

export type ReviewQueueItem = AnalysisResult["review_queue"]["items"][number];

export type TopIssue = {
  tabId: AnalysisTab;
  label: string;
  count: number;
  severity: "critical" | "high" | "moderate" | "info" | "clean";
};

export function buildTopIssues(result: AnalysisResult, limit = 7): TopIssue[] {
  const s = result.summary;
  const candidates: TopIssue[] = [
    {
      tabId: "below_minimum",
      label: "Below range minimum",
      count: s.below_minimum,
      severity: s.below_minimum > 0 ? "critical" : "clean",
    },
    {
      tabId: "new_hire_placement",
      label: "New hires below range",
      count: s.new_hire_placement_flags ?? 0,
      severity: (s.new_hire_placement_flags ?? 0) > 0 ? "critical" : "clean",
    },
    {
      tabId: "managers_below_reports",
      label: "Managers below reports",
      count: s.managers_below_reports,
      severity: s.managers_below_reports > 0 ? "critical" : "clean",
    },
    {
      tabId: "merit_matrix",
      label: "Merit matrix outliers",
      count: s.merit_matrix_flags ?? 0,
      severity: (s.merit_matrix_flags ?? 0) > 0 ? "high" : "clean",
    },
    {
      tabId: "merit_compa_flags",
      label: "Merit vs compa misalignment",
      count: s.merit_compa_flags ?? 0,
      severity: (s.merit_compa_flags ?? 0) > 0 ? "high" : "clean",
    },
    {
      tabId: "peer_spread",
      label: "Peer pay spread",
      count: s.peer_spread_flags ?? 0,
      severity: (s.peer_spread_flags ?? 0) > 0 ? "moderate" : "clean",
    },
    {
      tabId: "range_structure",
      label: "Range structure issues",
      count: s.range_structure_issues ?? 0,
      severity: (s.range_structure_issues ?? 0) > 0 ? "moderate" : "clean",
    },
    {
      tabId: "compression",
      label: "Salary compression",
      count: s.compression_issues,
      severity: s.compression_issues > 0 ? "moderate" : "clean",
    },
    {
      tabId: "performance_merit",
      label: "Performance × merit",
      count: s.performance_merit_flags ?? 0,
      severity: (s.performance_merit_flags ?? 0) > 0 ? "high" : "clean",
    },
    {
      tabId: "duplicate_ids",
      label: "Duplicate employee IDs",
      count: s.duplicate_ids,
      severity: s.duplicate_ids > 0 ? "high" : "clean",
    },
  ];

  return candidates.filter((item) => item.count > 0).slice(0, limit);
}

export type TabCountKind = "issues" | "rows" | "groups";

export type TabDefinition = {
  id: AnalysisTab;
  label: string;
  countKind: TabCountKind;
  hideWhenZero: boolean;
  count: (result: AnalysisResult) => number;
};

export const TAB_DEFINITIONS: TabDefinition[] = [
  {
    id: "review_queue",
    label: "Review Queue",
    countKind: "issues",
    hideWhenZero: false,
    count: (r) => r.summary.review_queue_items ?? r.review_queue?.total_items ?? 0,
  },
  {
    id: "below_minimum",
    label: "Below Minimum",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.below_minimum,
  },
  {
    id: "above_maximum",
    label: "Above Maximum",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.above_maximum,
  },
  {
    id: "duplicate_ids",
    label: "Duplicate IDs",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.duplicate_ids,
  },
  {
    id: "compression",
    label: "Salary Compression",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.compression_issues,
  },
  {
    id: "peer_spread",
    label: "Peer Pay Spread",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.peer_spread_flags ?? r.peer_spread?.flags?.length ?? 0,
  },
  {
    id: "managers_below_reports",
    label: "Managers Below Reports",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.managers_below_reports,
  },
  {
    id: "new_hire_placement",
    label: "New Hire Placement",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) =>
      r.summary.new_hire_placement_flags ??
      r.new_hire_placement?.below_range_count ??
      0,
  },
  {
    id: "range_penetration",
    label: "Range Penetration",
    countKind: "rows",
    hideWhenZero: false,
    count: (r) => r.range_penetration.length,
  },
  {
    id: "compa_ratio",
    label: "Compa-Ratio",
    countKind: "rows",
    hideWhenZero: false,
    count: (r) => r.compa_ratios.length,
  },
  {
    id: "compa_summary",
    label: "Compa Summary",
    countKind: "groups",
    hideWhenZero: true,
    count: (r) => r.compa_penetration_summary?.by_level?.length ?? 0,
  },
  {
    id: "post_merit_compa",
    label: "Post-Merit Compa",
    countKind: "rows",
    hideWhenZero: true,
    count: (r) => r.post_merit_compa?.employees?.length ?? 0,
  },
  {
    id: "range_structure",
    label: "Range Structure",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.range_structure_issues ?? r.range_structure?.issues?.length ?? 0,
  },
  {
    id: "midpoint_progression",
    label: "Midpoint Progression",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) =>
      r.summary.midpoint_progression_issues ?? r.midpoint_progression?.issues?.length ?? 0,
  },
  {
    id: "total_cash_comp",
    label: "Total Cash Comp",
    countKind: "rows",
    hideWhenZero: true,
    count: (r) => r.total_cash_comp?.employees?.length ?? 0,
  },
  {
    id: "pay_equity",
    label: "Pay Equity",
    countKind: "groups",
    hideWhenZero: false,
    count: (r) => {
      if (!r.pay_equity.available) return 0;
      return r.pay_equity.gender_gaps.length + r.pay_equity.race_gaps.length;
    },
  },
  {
    id: "tenure",
    label: "Tenure",
    countKind: "rows",
    hideWhenZero: false,
    count: (r) => r.tenure?.employees?.length ?? 0,
  },
  {
    id: "location_pay",
    label: "Location Pay",
    countKind: "groups",
    hideWhenZero: false,
    count: (r) => r.location_pay?.location_groups?.length ?? 0,
  },
  {
    id: "geo_pay_policy",
    label: "Geo Pay Policy",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.geo_pay_policy_flags ?? r.geo_pay_policy?.flags?.length ?? 0,
  },
  {
    id: "currency_report",
    label: "Currency",
    countKind: "groups",
    hideWhenZero: true,
    count: (r) => r.currency_report?.currencies?.length ?? 0,
  },
  {
    id: "employee_types",
    label: "Employee Types",
    countKind: "groups",
    hideWhenZero: true,
    count: (r) => r.employee_type_report?.types?.length ?? 0,
  },
  {
    id: "outlier_merit_increases",
    label: "Outlier Merit Increases",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.outlier_merit_increases,
  },
  {
    id: "new_hire_merit_flags",
    label: "New-Hire Merit",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.new_hire_merit_flags ?? r.new_hire_merit_flags.length,
  },
  {
    id: "merit_compa_flags",
    label: "Merit vs Compa",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.merit_compa_flags ?? r.merit_compa_flags?.length ?? 0,
  },
  {
    id: "merit_matrix",
    label: "Merit Matrix",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.merit_matrix_flags ?? r.merit_matrix?.flags?.length ?? 0,
  },
  {
    id: "performance_merit",
    label: "Performance × Merit",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.performance_merit_flags ?? r.performance_merit?.flags?.length ?? 0,
  },
  {
    id: "equity_grants",
    label: "Equity Grants",
    countKind: "rows",
    hideWhenZero: false,
    count: (r) => (r.column_mapping.equity_grant ? (r.equity_grants ?? []).length : 0),
  },
  {
    id: "unusual_comp_changes",
    label: "Unusual Promotions",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) =>
      (r.unusual_comp_changes ?? []).filter((row: { change_type: string }) => row.change_type === "promotion").length,
  },
  {
    id: "missing_bonus_targets",
    label: "Bonus Targets",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) =>
      r.summary.missing_bonus_targets +
      (r.summary.bonus_target_outliers ?? r.bonus_target_review?.outliers?.length ?? 0),
  },
  {
    id: "missing_salary_ranges",
    label: "Missing Salary Ranges",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.missing_salary_ranges,
  },
  {
    id: "invalid_effective_dates",
    label: "Invalid Effective Dates",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.invalid_effective_dates,
  },
  {
    id: "missing_data",
    label: "Missing Data",
    countKind: "issues",
    hideWhenZero: true,
    count: (r) => r.summary.missing_data,
  },
];

export const TAB_GROUPS: Array<{ title: string; ids: AnalysisTab[] }> = [
  {
    title: "Cycle readiness",
    ids: ["review_queue"],
  },
  {
    title: "Flagged issues",
    ids: [
      "below_minimum",
      "above_maximum",
      "duplicate_ids",
      "compression",
      "peer_spread",
      "managers_below_reports",
      "new_hire_placement",
    ],
  },
  {
    title: "Ranges & compa",
    ids: [
      "range_penetration",
      "compa_ratio",
      "compa_summary",
      "post_merit_compa",
      "range_structure",
      "midpoint_progression",
      "total_cash_comp",
    ],
  },
  {
    title: "Pay equity",
    ids: ["pay_equity"],
  },
  {
    title: "Workforce insights",
    ids: ["tenure", "location_pay", "geo_pay_policy", "currency_report", "employee_types"],
  },
  {
    title: "Merit & LTI",
    ids: [
      "outlier_merit_increases",
      "new_hire_merit_flags",
      "merit_compa_flags",
      "merit_matrix",
      "performance_merit",
      "equity_grants",
      "unusual_comp_changes",
    ],
  },
  {
    title: "Data quality",
    ids: [
      "missing_bonus_targets",
      "missing_salary_ranges",
      "invalid_effective_dates",
      "missing_data",
    ],
  },
];

export const TABS_BY_ID = Object.fromEntries(
  TAB_DEFINITIONS.map((tab) => [tab.id, tab]),
) as Record<AnalysisTab, TabDefinition>;

export function formatTabCount(tab: TabDefinition, count: number): string {
  if (tab.countKind === "rows") return `${count} rows`;
  if (tab.countKind === "groups") return `${count} groups`;
  return String(count);
}

export function tabSeverity(count: number, countKind: TabCountKind): string {
  if (countKind !== "issues") return "neutral";
  if (count === 0) return "clean";
  if (count >= 10) return "critical";
  if (count >= 3) return "high";
  return "moderate";
}

export function tabIsVisible(tabId: AnalysisTab, result: AnalysisResult): boolean {
  const tab = TABS_BY_ID[tabId];
  if (!tab) return false;
  if (tabId === "equity_grants") return Boolean(result.column_mapping.equity_grant);
  if (tabId === "pay_equity") return result.pay_equity.available;
  if (tabId === "tenure") return result.tenure.available;
  if (tabId === "location_pay") return result.location_pay.available;
  if (tabId === "compa_summary") return result.compa_penetration_summary?.available ?? false;
  if (tabId === "post_merit_compa") return result.post_merit_compa?.available ?? false;
  if (tabId === "total_cash_comp") return result.total_cash_comp?.available ?? false;
  if (tabId === "geo_pay_policy") return result.geo_pay_policy?.available ?? false;
  if (tabId === "currency_report") return result.currency_report?.available ?? false;
  if (tabId === "employee_types") return result.employee_type_report?.available ?? false;
  if (tabId === "performance_merit") return result.performance_merit?.available ?? false;
  if (tabId === "new_hire_placement") return result.new_hire_placement?.available ?? false;
  const count = tab.count(result);
  if (tab.hideWhenZero && count === 0) return false;
  return true;
}
