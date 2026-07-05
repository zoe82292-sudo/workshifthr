import { useMemo, useState } from "react";
import type { AnalysisResult, AnalysisTab } from "../types";
import { buildTopIssues } from "../tabConfig";
import { InsightsPanel } from "./InsightsPanel";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const BAND_COLORS: Record<string, string> = {
  below_range: "var(--danger)",
  bottom_quartile: "var(--warning)",
  mid_range: "var(--accent-vivid)",
  top_quartile: "var(--info)",
  above_range: "var(--danger)",
};

interface CycleReadinessPanelProps {
  result: AnalysisResult;
  onNavigateTab: (tab: AnalysisTab) => void;
  onTargetMeritChange?: (percent: number) => void;
  targetMeritPercent: number | null;
}

export function CycleReadinessPanel({
  result,
  onNavigateTab,
  onTargetMeritChange,
  targetMeritPercent,
}: CycleReadinessPanelProps) {
  const [meritExpanded, setMeritExpanded] = useState(false);
  const topIssues = useMemo(() => buildTopIssues(result), [result]);
  const queue = result.review_queue;
  const distribution = result.penetration_distribution;
  const budget = result.merit_budget_variance;

  const targetPool = useMemo(() => {
    if (targetMeritPercent == null || !Number.isFinite(targetMeritPercent)) return null;
    return (budget.payroll_base * targetMeritPercent) / 100;
  }, [budget.payroll_base, targetMeritPercent]);

  const poolVariance = useMemo(() => {
    if (targetPool == null || !budget.available) return null;
    return budget.projected_merit_pool - targetPool;
  }, [budget.available, budget.projected_merit_pool, targetPool]);

  return (
    <>
      <section className="cycle-readiness">
        <div className="panel-header">
          <div>
            <h2>Cycle readiness</h2>
            <p className="cycle-readiness__subtitle">
              {queue.critical_count > 0
                ? `${queue.critical_count} critical and ${queue.high_count} high-priority items need review before you lock merit.`
                : queue.total_items > 0
                  ? `${queue.total_items} items in your review queue — no critical blockers detected.`
                  : "No major compensation issues detected. Review ranges and merit alignment before finalizing."}
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => onNavigateTab("review_queue")}
          >
            Open review queue ({queue.total_items})
          </button>
        </div>

        <div className="cycle-readiness__issues">
          {topIssues.length === 0 ? (
            <div className="cycle-readiness__issue cycle-readiness__issue--clean">
              <span className="tab-severity tab-severity--clean" aria-hidden />
              <span>All priority checks passed — drill into tabs below for detail.</span>
            </div>
          ) : (
            topIssues.map((issue) => (
              <button
                key={issue.tabId}
                type="button"
                className={`cycle-readiness__issue cycle-readiness__issue--${issue.severity}`}
                onClick={() => onNavigateTab(issue.tabId)}
              >
                <span className={`tab-severity tab-severity--${issue.severity}`} aria-hidden />
                <span className="cycle-readiness__issue-label">{issue.label}</span>
                <strong>{issue.count}</strong>
              </button>
            ))
          )}
        </div>

        {distribution.available ? (
          <div className="penetration-chart">
            <h3>Range penetration distribution</h3>
            <div className="penetration-chart__bars">
              {distribution.bands.map((band) => (
                <div className="penetration-chart__row" key={band.band}>
                  <span className="penetration-chart__label">{band.label}</span>
                  <div className="penetration-chart__track">
                    <div
                      className="penetration-chart__fill"
                      style={{
                        width: `${Math.max(band.percent, band.count > 0 ? 4 : 0)}%`,
                        background: BAND_COLORS[band.band] ?? "var(--accent)",
                      }}
                    />
                  </div>
                  <span className="penetration-chart__meta">
                    {band.count} ({band.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {budget.available && targetMeritPercent != null ? (
          <div className="merit-budget-variance">
            <h3>Merit pool vs target</h3>
            <div className="merit-budget-variance__grid">
              <div>
                <span className="stat-card__label">File average merit</span>
                <strong>{budget.file_average_merit != null ? `${budget.file_average_merit}%` : "—"}</strong>
              </div>
              <div>
                <span className="stat-card__label">Your target</span>
                <strong>{targetMeritPercent}%</strong>
              </div>
              <div>
                <span className="stat-card__label">Uploaded pool</span>
                <strong>{formatCurrency(budget.projected_merit_pool)}</strong>
              </div>
              <div>
                <span className="stat-card__label">Target pool</span>
                <strong>{formatCurrency(targetPool ?? 0)}</strong>
              </div>
              <div
                className={
                  poolVariance != null && poolVariance > 0
                    ? "merit-budget-variance__delta merit-budget-variance__delta--over"
                    : "merit-budget-variance__delta"
                }
              >
                <span className="stat-card__label">Variance</span>
                <strong>
                  {poolVariance != null
                    ? `${poolVariance >= 0 ? "+" : ""}${formatCurrency(poolVariance)}`
                    : "—"}
                </strong>
              </div>
            </div>
            {budget.departments.length > 0 ? (
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => setMeritExpanded((value) => !value)}
              >
                {meritExpanded ? "Hide" : "Show"} merit by department
              </button>
            ) : null}
            {meritExpanded ? (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Avg merit %</th>
                      <th>Pool</th>
                      <th>vs target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.departments.map((dept) => {
                      const deptTarget = (dept.payroll_base * targetMeritPercent) / 100;
                      const delta = dept.projected_pool - deptTarget;
                      return (
                        <tr key={dept.department}>
                          <td>{dept.department}</td>
                          <td>{dept.average_merit_percent}%</td>
                          <td>{formatCurrency(dept.projected_pool)}</td>
                          <td className={delta > 0 ? "text-over-budget" : ""}>
                            {delta >= 0 ? "+" : ""}
                            {formatCurrency(delta)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <InsightsPanel result={result} onTargetMeritChange={onTargetMeritChange} compact />
    </>
  );
}
