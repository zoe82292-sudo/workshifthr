import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";
import type { EmployeeRecord } from "../types";

type MarketingPreviewProps = {
  /** Crop the preview for video scenes */
  focus?: "full" | "summary" | "table";
  className?: string;
};

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function MarketingPreview({ focus = "full", className = "" }: MarketingPreviewProps) {
  const result = getBundledDemoAnalysis();
  const { summary, insights, below_minimum } = result;
  const exec = insights.executive_summary;
  const cost = insights.cost_metrics;
  const budget = insights.budget_impact;

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
  const showTable = focus === "full" || focus === "table";

  return (
    <div className={`marketing-preview ${className}`.trim()} data-focus={focus}>
      <header className="marketing-preview__header">
        <div>
          <p className="marketing-preview__eyebrow">Analysis results</p>
          <h1>Compensation QA dashboard</h1>
        </div>
        <div className="marketing-preview__actions" aria-hidden="true">
          <span className="marketing-preview__btn">PDF summary</span>
          <span className="marketing-preview__btn marketing-preview__btn--primary">Excel report</span>
        </div>
      </header>

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
          <div className="marketing-preview__table-header">
            <h2>Below range minimum</h2>
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
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
