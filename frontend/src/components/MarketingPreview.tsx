import { useMemo } from "react";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";
import type { EmployeeRecord } from "../types";

type MarketingPreviewProps = {
  /** Crop the preview for video scenes */
  focus?: "full" | "summary" | "table" | "sell";
  /** Use real file name and meta for demo video captures */
  videoMode?: boolean;
  /** Show manager/compression alerts under the table (video issues scene) */
  showAlerts?: boolean;
  className?: string;
};

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function MarketingPreview({
  focus = "full",
  videoMode = false,
  showAlerts = false,
  className = "",
}: MarketingPreviewProps) {
  const result = getBundledDemoAnalysis();
  const { summary, insights, below_minimum } = result;
  const exec = insights.executive_summary;
  const cost = insights.cost_metrics;
  const budget = insights.budget_impact;

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

  const compressionAlerts = useMemo(() => {
    const seen = new Set<string>();
    const picks = [];
    for (const issue of result.compression) {
      const name = (issue.employee_name ?? issue.issue_type.replace(/_/g, " ")).trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      picks.push({ name, detail: compressionDetail(issue) });
      if (picks.length >= 2) break;
    }
    return picks;
  }, [result]);

  const stats = [
    { label: "Review queue", value: result.review_queue.total_items, tone: "" },
    { label: "Below minimum", value: summary.below_minimum, tone: "marketing-preview__stat--danger" },
    { label: "Compression", value: summary.compression_issues, tone: "marketing-preview__stat--warning" },
    { label: "Mgr inversions", value: summary.managers_below_reports, tone: "marketing-preview__stat--danger" },
    { label: "Merit matrix", value: summary.merit_matrix_flags ?? 0, tone: "marketing-preview__stat--warning" },
    { label: "Pay equity gaps", value: summary.pay_equity_gaps, tone: "marketing-preview__stat--info" },
  ];

  const insightCards = [
    {
      title: "Cost to minimum",
      label: "One-time adjustment to range floor",
      value: formatMoney(cost.total_gap_to_minimum),
      meta: `${cost.employees_below_minimum} employees below minimum`,
    },
    {
      title: "Projected merit pool",
      label: "From uploaded merit % column",
      value: formatMoney(budget.projected_merit_pool),
      meta: `${insights.merit_calculator.average_merit_percent}% average merit`,
    },
    {
      title: "Total budget exposure",
      label: "Adjustments + projected merit",
      value: formatMoney(budget.total_budget_impact),
      meta: "For finance / leadership review",
    },
    {
      title: "Average compa-ratio",
      label: "Across valid employee rows",
      value: `${insights.compa_ratio.average_compa_ratio}%`,
      meta: `${insights.compa_ratio.below_90_percent} below 90% of midpoint`,
    },
  ];

  const showSummary = focus === "full" || focus === "summary";
  const showSell = focus === "sell";
  const showTable = focus === "full" || focus === "table";

  const sellCards = [
    {
      title: "Below range minimum",
      value: formatMoney(cost.total_gap_to_minimum),
      meta: `${summary.below_minimum} employees need raises to hit range floor`,
      tone: "marketing-preview__sell-card--danger",
      detail: exec.bullets.find((b) => b.includes("below range minimum")) ?? exec.bullets[1],
    },
    {
      title: "Manager inversions",
      value: String(summary.managers_below_reports),
      meta: "managers earning less than a direct report",
      tone: "marketing-preview__sell-card--danger",
      detail: "Catch pay hierarchy issues before merit letters go out.",
    },
    {
      title: "Review queue",
      value: String(result.review_queue.total_items),
      meta: `${result.review_queue.critical_count} critical · ranked by severity`,
      tone: "marketing-preview__sell-card--warning",
      detail: "Prioritized list so comp teams know what to fix first.",
    },
  ];

  return (
    <div className={`marketing-preview ${className}`.trim()} data-focus={focus}>
      <header className="marketing-preview__header">
        <div>
          <p className="marketing-preview__eyebrow">Analysis results</p>
          {videoMode ? (
            <>
              <h1 className="marketing-preview__filename">compensation-sample.csv</h1>
              <p className="marketing-preview__meta">
                <span>{summary.valid_rows} employees analyzed</span>
                <span className={`pill risk-${exec.risk_level}`}>{exec.risk_level} risk</span>
              </p>
            </>
          ) : (
            <h1>Compensation QA dashboard</h1>
          )}
        </div>
        <div className="marketing-preview__actions" aria-hidden="true">
          <span className="marketing-preview__btn">PDF summary</span>
          <span className="marketing-preview__btn marketing-preview__btn--primary">Excel report</span>
        </div>
      </header>

      {showSell ? (
        <>
          <section className="marketing-preview__hero-band panel">
            <div className="marketing-preview__hero-band__copy">
              <p className="marketing-preview__hero-band__eyebrow">Before you lock merit</p>
              <h2>{exec.headline}</h2>
              <span className={`pill risk-${exec.risk_level}`}>{exec.risk_level} risk</span>
            </div>
            <div className="marketing-preview__hero-band__exposure">
              <span>Total budget exposure</span>
              <strong>{formatMoney(budget.total_budget_impact)}</strong>
              <small>Adjustments + projected merit pool</small>
            </div>
          </section>

          <div className="marketing-preview__sell-grid">
            {sellCards.map((card) => (
              <article
                key={card.title}
                className={`marketing-preview__sell-card panel ${card.tone}`.trim()}
              >
                <h3>{card.title}</h3>
                <strong>{card.value}</strong>
                <p className="marketing-preview__sell-card__meta">{card.meta}</p>
                <p className="marketing-preview__sell-card__detail">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="marketing-preview__insights marketing-preview__insights--sell">
            {insightCards.map((card) => (
              <article className="marketing-preview__insight" key={card.title}>
                <h3>{card.title}</h3>
                <strong className="marketing-preview__insight-value">{card.value}</strong>
                <p className="marketing-preview__insight-meta">{card.meta}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {showSummary ? (
        <>
          <section className="marketing-preview__exec">
            <div className="marketing-preview__exec-top">
              <h2>Executive summary</h2>
              <span className={`pill risk-${exec.risk_level}`}>{exec.risk_level} risk</span>
            </div>
            <p className="marketing-preview__headline">{exec.headline}</p>
            <ul className="marketing-preview__bullets">
              {exec.bullets.slice(0, 4).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>

          <div className="marketing-preview__insights">
            {insightCards.map((card) => (
              <article className="marketing-preview__insight" key={card.title}>
                <h3>{card.title}</h3>
                <p className="marketing-preview__insight-label">{card.label}</p>
                <strong className="marketing-preview__insight-value">{card.value}</strong>
                <p className="marketing-preview__insight-meta">{card.meta}</p>
              </article>
            ))}
          </div>

          <div className="marketing-preview__stats">
            {stats.map((stat) => (
              <div className={`marketing-preview__stat ${stat.tone}`.trim()} key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {showTable ? (
        <section className="marketing-preview__table-section">
          {videoMode ? (
            <div className="marketing-preview__sell-callout">
              <strong>What leadership asks about</strong>
              <span>
                Dollar gaps by employee before merit week — not just a count on a spreadsheet.
              </span>
            </div>
          ) : null}
          <div className="marketing-preview__table-header">
            <div>
              <h2>Below range minimum</h2>
              {videoMode ? (
                <p className="marketing-preview__table-sub">
                  {below_minimum.length} employees · {formatMoney(cost.total_gap_to_minimum)} total gap
                </p>
              ) : null}
            </div>
            <span className="marketing-preview__table-count">{below_minimum.length} employees</span>
          </div>
          <div className="marketing-preview__table-wrap">
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
                {below_minimum.map((row: EmployeeRecord) => (
                  <tr key={row.employee_id}>
                    <td>{row.employee_name}</td>
                    <td>{row.department}</td>
                    <td>{formatMoney(row.salary ?? 0)}</td>
                    <td>{formatMoney(row.range_min ?? 0)}</td>
                    <td className="marketing-preview__gap">
                      {formatMoney(row.gap_to_minimum ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {videoMode ? (
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total gap to minimum</td>
                    <td className="marketing-preview__gap">{formatMoney(cost.total_gap_to_minimum)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          {showAlerts ? (
            <div className="marketing-preview__alerts">
              <article className="marketing-preview__alert panel">
                <header>
                  <h3>Manager inversions</h3>
                  <span>{summary.managers_below_reports}</span>
                </header>
                <ul>
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
              </article>
              <article className="marketing-preview__alert panel">
                <header>
                  <h3>Compression flags</h3>
                  <span>{summary.compression_issues}</span>
                </header>
                <ul>
                  {compressionAlerts.map((alert) => (
                    <li key={alert.name}>
                      <strong>{alert.name}</strong>
                      <span>{alert.detail}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function compressionDetail(issue: ReturnType<typeof getBundledDemoAnalysis>["compression"][number]) {
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
