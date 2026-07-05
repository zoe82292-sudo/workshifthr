import type { AnalysisResult, AnalysisTab } from "./types";

/** Default tab after analysis — review queue first when items exist. */
export function pickInitialTab(result: AnalysisResult): AnalysisTab {
  const queueCount = result.summary.review_queue_items ?? result.review_queue?.total_items ?? 0;
  if (queueCount > 0) return "review_queue";
  if (result.summary.below_minimum > 0) return "below_minimum";
  if (result.summary.above_maximum > 0) return "above_maximum";
  if (result.summary.duplicate_ids > 0) return "duplicate_ids";
  if (result.summary.managers_below_reports > 0) return "managers_below_reports";
  if ((result.summary.equity_grant_outliers ?? 0) > 0) return "equity_grants";
  return "range_penetration";
}
