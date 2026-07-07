import { useMemo, useState } from "react";
import type { AnalysisResult, AnalysisTab } from "../types";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";
import { tabIsVisible } from "../tabConfig";
import { CycleReadinessPanel } from "./CycleReadinessPanel";
import { InsightsPanel } from "./InsightsPanel";
import { ReviewQueuePanel } from "./ReviewQueuePanel";

type DemoVideoResultsSceneProps = {
  variant: "overview" | "review_queue" | "below_minimum";
};

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function DemoVideoAppChrome({ result, fileName }: { result: AnalysisResult; fileName: string }) {
  return (
    <header className="demo-video-app-chrome">
      <div>
        <p className="demo-video-app-chrome__file">{fileName}</p>
        <p className="demo-video-app-chrome__meta">
          Analysis complete · {result.summary.valid_rows} employees ·{" "}
          <span className={`pill risk-${result.insights.executive_summary.risk_level}`}>
            {result.insights.executive_summary.risk_level} risk
          </span>
        </p>
      </div>
      <div className="demo-video-app-chrome__actions" aria-hidden>
        <span>PDF summary</span>
        <span className="demo-video-app-chrome__actions--primary">Excel report</span>
      </div>
    </header>
  );
}

function DemoVideoTabStrip({ active }: { active: AnalysisTab }) {
  const tabs: { id: AnalysisTab; label: string }[] = [
    { id: "review_queue", label: "Review queue" },
    { id: "below_minimum", label: "Below minimum" },
    { id: "compression", label: "Compression" },
    { id: "managers_below_reports", label: "Manager pay" },
    { id: "pay_equity", label: "Pay equity" },
  ];

  return (
    <nav className="demo-video-tab-strip" aria-hidden>
      {tabs.map((tab) => (
        <span key={tab.id} className={active === tab.id ? "is-active" : ""}>
          {tab.label}
        </span>
      ))}
    </nav>
  );
}

function BelowMinimumScene({ result }: { result: AnalysisResult }) {
  const compression = result.compression.slice(0, 4);

  return (
    <>
      <DemoVideoTabStrip active="below_minimum" />
      <div className="demo-video-issues-grid">
        <section className="demo-video-issues-panel">
          <div className="demo-video-issues-panel__head">
            <h2>Below range minimum</h2>
            <span className="demo-video-issues-panel__count">{result.below_minimum.length} employees</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Salary</th>
                  <th>Range min</th>
                  <th>Gap</th>
                </tr>
              </thead>
              <tbody>
                {result.below_minimum.map((row) => (
                  <tr key={row.employee_id}>
                    <td>{row.employee_name}</td>
                    <td>{row.department}</td>
                    <td>{formatMoney(row.salary ?? 0)}</td>
                    <td>{formatMoney(row.range_min ?? 0)}</td>
                    <td className="gap-cell">{formatMoney(row.gap_to_minimum ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="demo-video-issues-panel demo-video-issues-panel--secondary">
          <div className="demo-video-issues-panel__head">
            <h2>Compression flags</h2>
            <span className="demo-video-issues-panel__count">{result.summary.compression_issues} issues</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Issue</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {compression.map((issue, index) => (
                  <tr key={`${issue.employee_id}-${index}`}>
                    <td>{issue.employee_name}</td>
                    <td>{issue.issue_type}</td>
                    <td>{issue.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function OverviewStatCards({ result, onNavigate }: { result: AnalysisResult; onNavigate: () => void }) {
  const cards = useMemo(
    () =>
      [
        {
          tab: "review_queue" as AnalysisTab,
          label: "Review queue",
          count: result.review_queue.total_items,
          meta: `${result.review_queue.critical_count} critical`,
          tone: "",
        },
        {
          tab: "below_minimum" as AnalysisTab,
          label: "Below minimum",
          count: result.summary.below_minimum,
          tone: "stat-card--danger",
        },
        {
          tab: "compression" as AnalysisTab,
          label: "Compression",
          count: result.summary.compression_issues,
          tone: "stat-card--warning",
        },
        {
          tab: "managers_below_reports" as AnalysisTab,
          label: "Mgr inversions",
          count: result.summary.managers_below_reports,
          tone: "stat-card--danger",
        },
        {
          tab: "merit_matrix" as AnalysisTab,
          label: "Merit matrix",
          count: result.summary.merit_matrix_flags ?? 0,
          tone: "stat-card--warning",
        },
        {
          tab: "pay_equity" as AnalysisTab,
          label: "Pay equity gaps",
          count: result.summary.pay_equity_gaps,
          tone: "stat-card--info",
        },
      ].filter(
        (card) => card.tab === "review_queue" || card.count > 0 || tabIsVisible(card.tab, result),
      ),
    [result],
  );

  return (
    <div className="summary-grid card-grid card-grid--6 demo-video-stat-row" aria-label="Priority counts">
      {cards.map((card) => (
        <button
          key={card.tab}
          type="button"
          className={`summary-card stat-card stat-card--clickable ${card.tone ?? ""}`.trim()}
          onClick={onNavigate}
        >
          <span className="stat-card__label">{card.label}</span>
          <strong className="stat-card__value">{card.count}</strong>
          {card.meta ? <span className="stat-card__meta">{card.meta}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function DemoVideoResultsScene({ variant }: DemoVideoResultsSceneProps) {
  const result = getBundledDemoAnalysis();
  const [targetMeritPercent, setTargetMeritPercent] = useState<number | null>(
    () => result.insights.merit_calculator.average_merit_percent ?? 3.5,
  );
  const noop = () => {};

  return (
    <div className={`demo-video-results demo-video-results--${variant}`}>
      <DemoVideoAppChrome result={result} fileName="compensation-sample.csv" />

      {variant === "overview" ? (
        <>
          <CycleReadinessPanel
            result={result}
            onNavigateTab={noop}
            onTargetMeritChange={setTargetMeritPercent}
            targetMeritPercent={targetMeritPercent}
          />
          <InsightsPanel
            result={result}
            onTargetMeritChange={setTargetMeritPercent}
            compact
          />
          <OverviewStatCards result={result} onNavigate={noop} />
        </>
      ) : null}

      {variant === "review_queue" ? (
        <>
          <DemoVideoTabStrip active="review_queue" />
          <ReviewQueuePanel result={result} onNavigateTab={noop} />
        </>
      ) : null}

      {variant === "below_minimum" ? <BelowMinimumScene result={result} /> : null}
    </div>
  );
}
