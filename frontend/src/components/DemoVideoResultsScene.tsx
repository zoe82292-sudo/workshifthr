import { useMemo } from "react";
import type { AnalysisResult, AnalysisTab } from "../types";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";
import { buildTopIssues } from "../tabConfig";

type DemoVideoResultsSceneProps = {
  variant: "overview" | "below_minimum";
};

const BAND_COLORS: Record<string, string> = {
  below_range: "var(--danger)",
  bottom_quartile: "var(--warning)",
  mid_range: "var(--accent-vivid)",
  top_quartile: "var(--info)",
  above_range: "var(--danger)",
};

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function shortCompressionDetail(issue: AnalysisResult["compression"][number]) {
  if (issue.issue_type === "overlap") {
    return "Level 3 max overlaps level 4 median — range structure needs review.";
  }
  if (issue.issue_type === "employee_inversion") {
    const salary = issue.higher_salary ?? issue.lower_salary;
    return salary != null
      ? `Earns ${formatMoney(salary)} — at or above a higher-level peer.`
      : "Paid at or above a higher-level peer in the same department.";
  }
  return issue.description.length > 90 ? `${issue.description.slice(0, 87)}…` : issue.description;
}

function DemoVideoAppChrome({ result, fileName }: { result: AnalysisResult; fileName: string }) {
  return (
    <header className="demo-video-app-chrome">
      <div className="demo-video-app-chrome__title">
        <p className="demo-video-app-chrome__eyebrow">Analysis results</p>
        <p className="demo-video-app-chrome__file">{fileName}</p>
        <p className="demo-video-app-chrome__meta">
          <span>{result.summary.valid_rows} employees analyzed</span>
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

function VideoDashboardLayout({ result }: { result: AnalysisResult }) {
  const topIssues = useMemo(() => buildTopIssues(result, 5), [result]);
  const queue = result.review_queue;
  const distribution = result.penetration_distribution;
  const { insights } = result;
  const budget = insights.budget_impact;
  const merit = insights.merit_calculator;

  const kpiCards = [
    { label: "Review queue", value: queue.total_items, meta: `${queue.critical_count} critical`, tone: "" },
    { label: "Below minimum", value: result.summary.below_minimum, tone: "stat-card--danger" },
    { label: "Compression", value: result.summary.compression_issues, tone: "stat-card--warning" },
    { label: "Mgr inversions", value: result.summary.managers_below_reports, tone: "stat-card--danger" },
  ];

  return (
    <div className="demo-video-dash">
      <div className="demo-video-dash__kpis">
        {kpiCards.map((card) => (
          <article key={card.label} className={`demo-video-dash__kpi ${card.tone}`.trim()}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.meta ? <small>{card.meta}</small> : null}
          </article>
        ))}
      </div>
      <div className="demo-video-dash__grid">
        <section className="demo-video-dash__panel panel">
          <header className="demo-video-dash__panel-head">
            <div>
              <h2>Cycle readiness</h2>
              <p>
                {queue.critical_count} critical · {queue.high_count} high-priority · {queue.total_items}{" "}
                in review queue
              </p>
            </div>
            <span className="demo-video-dash__queue-pill">Open queue</span>
          </header>
          <ul className="demo-video-dash__issues">
            {topIssues.map((issue) => (
              <li key={issue.tabId} className={`demo-video-dash__issue demo-video-dash__issue--${issue.severity}`}>
                <span className={`tab-severity tab-severity--${issue.severity}`} aria-hidden />
                <span>{issue.label}</span>
                <strong>{issue.count}</strong>
              </li>
            ))}
          </ul>
          <div className="demo-video-dash__callout">
            <p>{insights.executive_summary.headline}</p>
            <strong>{formatMoney(budget.total_budget_impact)} total exposure</strong>
          </div>
        </section>

        <section className="demo-video-dash__panel panel">
          {distribution.available ? (
            <div className="demo-video-dash__penetration">
              <h3>Range penetration</h3>
              {distribution.bands.map((band) => (
                <div className="demo-video-dash__bar-row" key={band.band}>
                  <span className="demo-video-dash__bar-label">{band.label}</span>
                  <div className="demo-video-dash__bar-track">
                    <div
                      className="demo-video-dash__bar-fill"
                      style={{
                        width: `${Math.max(band.percent, band.count > 0 ? 6 : 0)}%`,
                        background: BAND_COLORS[band.band] ?? "var(--accent)",
                      }}
                    />
                  </div>
                  <span className="demo-video-dash__bar-meta">
                    {band.count} ({band.percent}%)
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="demo-video-dash__budget">
            <h3>Merit pool vs target</h3>
            <div className="demo-video-dash__budget-grid">
              <div>
                <span>Average merit</span>
                <strong>{merit.average_merit_percent}%</strong>
              </div>
              <div>
                <span>Uploaded pool</span>
                <strong>{formatMoney(budget.projected_merit_pool)}</strong>
              </div>
              <div>
                <span>Cost to minimum</span>
                <strong>{formatMoney(insights.cost_metrics.total_gap_to_minimum)}</strong>
              </div>
              <div>
                <span>Total exposure</span>
                <strong>{formatMoney(budget.total_budget_impact)}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function VideoIssuesLayout({ result }: { result: AnalysisResult }) {
  const compression = useMemo(() => {
    const seen = new Set<string>();
    const picks = [];
    for (const issue of result.compression) {
      const name = (issue.employee_name ?? "").trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      picks.push(issue);
      if (picks.length >= 3) break;
    }
    return picks;
  }, [result]);

  const managerIssues = useMemo(
    () =>
      result.managers_below_reports
        .filter((issue) => {
          const name = (issue.manager_name ?? "").trim();
          return name && name !== "Duplicate Row";
        })
        .slice(0, 2),
    [result],
  );

  return (
    <>
      <DemoVideoTabStrip active="below_minimum" />
      <div className="demo-video-issues-layout">
        <section className="demo-video-issues-full panel">
          <header className="demo-video-issues-full__head">
            <h2>Below range minimum</h2>
            <span>{result.below_minimum.length} employees</span>
          </header>
          <table className="demo-video-issues-full__table">
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
            <tfoot>
              <tr>
                <td colSpan={4}>Total gap to minimum</td>
                <td className="gap-cell">
                  {formatMoney(result.insights.cost_metrics.total_gap_to_minimum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="demo-video-issues-cards">
          {managerIssues.length > 0 ? (
            <section className="demo-video-side-panel panel">
              <header className="demo-video-side-panel__head">
                <h3>Manager inversions</h3>
                <span>{result.summary.managers_below_reports}</span>
              </header>
              <ul className="demo-video-side-panel__list">
                {managerIssues.map((issue) => (
                  <li key={`${issue.manager_id}-${issue.report_id}`}>
                    <strong>{issue.manager_name}</strong>
                    <span>
                      Mgr {formatMoney(issue.manager_salary ?? 0)} · Report{" "}
                      {formatMoney(issue.report_salary ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="demo-video-side-panel panel">
            <header className="demo-video-side-panel__head">
              <h3>Compression flags</h3>
              <span>{result.summary.compression_issues}</span>
            </header>
            <ul className="demo-video-side-panel__list">
              {compression.map((issue, index) => (
                <li key={`${issue.employee_name ?? issue.issue_type}-${index}`}>
                  <strong>{issue.employee_name ?? issue.issue_type.replace(/_/g, " ")}</strong>
                  <span>{shortCompressionDetail(issue)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

export function DemoVideoResultsScene({ variant }: DemoVideoResultsSceneProps) {
  const result = getBundledDemoAnalysis();

  return (
    <div className={`demo-video-results demo-video-results--${variant}`}>
      <DemoVideoAppChrome result={result} fileName="compensation-sample.csv" />
      {variant === "overview" ? <VideoDashboardLayout result={result} /> : null}
      {variant === "below_minimum" ? <VideoIssuesLayout result={result} /> : null}
    </div>
  );
}
