import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function DemoPdfPreview() {
  const result = getBundledDemoAnalysis();
  const { insights, summary } = result;
  const exec = insights.executive_summary;
  const budget = insights.budget_impact;
  const compa = insights.compa_ratio;

  const budgetRows = [
    ["Cost to range minimum", formatMoney(budget.cost_to_minimum)],
    ["Projected merit pool", formatMoney(budget.projected_merit_pool)],
    ["Total budget impact", formatMoney(budget.total_budget_impact)],
    ["Average compa-ratio", compa.average_compa_ratio != null ? formatPercent(compa.average_compa_ratio) : "—"],
  ];

  const issueRows = [
    ["Review queue", String(summary.review_queue_items ?? result.review_queue?.total_items ?? 0)],
    ["Below minimum", String(summary.below_minimum)],
    ["Mgr inversions", String(summary.managers_below_reports)],
    ["Compression", String(summary.compression_issues)],
    ["Pay equity gaps", String(summary.pay_equity_gaps)],
  ].filter((row) => row[1] !== "0");

  return (
    <div className="demo-pdf-preview">
      <article className="demo-pdf-preview__page">
        <header className="demo-pdf-preview__header">
          <p className="demo-pdf-preview__brand">ShiftWorksHR</p>
          <p className="demo-pdf-preview__subtitle">Compensation Cycle Summary</p>
          <p className="demo-pdf-preview__meta">
            {summary.valid_rows} employees analyzed · Confidential — internal use only
          </p>
        </header>

        <div className="demo-pdf-preview__body">
          <p className={`demo-pdf-preview__risk risk-${exec.risk_level}`}>
            Cycle risk: {exec.risk_level.toUpperCase()}
          </p>
          <p className="demo-pdf-preview__headline">{exec.headline}</p>

          <div className="demo-pdf-preview__tables">
            <table className="demo-pdf-preview__table">
              <thead>
                <tr>
                  <th colSpan={2}>Budget metric</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="demo-pdf-preview__table">
              <thead>
                <tr>
                  <th colSpan={2}>Priority issues</th>
                </tr>
              </thead>
              <tbody>
                {issueRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="demo-pdf-preview__section-title">Key findings</h3>
          <ul className="demo-pdf-preview__bullets">
            {exec.bullets.slice(0, 4).map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
