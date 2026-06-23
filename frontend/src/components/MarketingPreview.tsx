import type { MarketingPreviewData } from "../data/marketingDemoData";

interface MarketingPreviewProps {
  data: MarketingPreviewData;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function MarketingPreview({ data }: MarketingPreviewProps) {
  const { insights, summary } = data;
  const meritPercent = insights.merit_calculator.average_merit_percent ?? 3.5;
  const projectedMeritPool =
    (insights.merit_calculator.payroll_base * meritPercent) / 100;
  const combinedBudget =
    insights.cost_metrics.total_gap_to_minimum + projectedMeritPool;
  const tableRows = data.below_minimum.slice(0, 3);
  const summaryBullets = insights.executive_summary.bullets.slice(0, 3);

  return (
    <div className="marketing-preview" id="marketing-preview-root">
      <header className="marketing-preview__header">
        <div>
          <p className="marketing-preview__eyebrow">Compensation analysis</p>
          <h1>Analysis results</h1>
        </div>
        <div className="marketing-preview__actions" aria-hidden="true">
          <span className="marketing-preview__btn marketing-preview__btn--primary">
            Download Excel
          </span>
          <span className="marketing-preview__btn">Download PDF</span>
        </div>
      </header>

      <section className="marketing-preview__exec">
        <div className="marketing-preview__exec-top">
          <h2>Executive summary</h2>
          <span className={`pill risk-${insights.executive_summary.risk_level}`}>
            {insights.executive_summary.risk_level} risk
          </span>
        </div>
        <p className="marketing-preview__headline">
          {insights.executive_summary.headline}
        </p>
        <ul className="marketing-preview__bullets">
          {summaryBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section className="marketing-preview__insights" aria-label="Key metrics">
        <article className="marketing-preview__insight">
          <h3>Cost to minimum</h3>
          <p className="marketing-preview__insight-label">
            Total dollars to bring employees to range floor
          </p>
          <strong className="marketing-preview__insight-value">
            {formatCurrency(insights.cost_metrics.total_gap_to_minimum)}
          </strong>
          <p className="marketing-preview__insight-meta">
            {insights.cost_metrics.employees_below_minimum} employees · avg gap{" "}
            {formatCurrency(insights.cost_metrics.average_gap_to_minimum)}
          </p>
        </article>

        <article className="marketing-preview__insight">
          <h3>Budget impact</h3>
          <p className="marketing-preview__insight-label">
            Remediation plus merit pool exposure
          </p>
          <strong className="marketing-preview__insight-value">
            {formatCurrency(combinedBudget)}
          </strong>
          <p className="marketing-preview__insight-meta">
            Minimum {formatCurrency(insights.budget_impact.cost_to_minimum)} · merit{" "}
            {formatCurrency(projectedMeritPool)}
          </p>
        </article>

        <article className="marketing-preview__insight">
          <h3>Merit pool</h3>
          <p className="marketing-preview__insight-label">
            Projected at {meritPercent}% target increase
          </p>
          <strong className="marketing-preview__insight-value">
            {formatCurrency(projectedMeritPool)}
          </strong>
          <p className="marketing-preview__insight-meta">
            Based on {formatCurrency(insights.merit_calculator.payroll_base)} eligible
            payroll
          </p>
        </article>

        <article className="marketing-preview__insight">
          <h3>Compa-ratio</h3>
          <p className="marketing-preview__insight-label">Average vs. range midpoint</p>
          <strong className="marketing-preview__insight-value">
            {formatPercent(insights.compa_ratio.average_compa_ratio)}
          </strong>
          <p className="marketing-preview__insight-meta">
            {insights.compa_ratio.below_90_percent} below 90% ·{" "}
            {insights.compa_ratio.between_90_and_110} in range ·{" "}
            {insights.compa_ratio.above_110_percent} above 110%
          </p>
        </article>
      </section>

      <section className="marketing-preview__stats" aria-label="Summary counts">
        <div className="marketing-preview__stat">
          <span>Total rows</span>
          <strong>{summary.total_rows}</strong>
        </div>
        <div className="marketing-preview__stat marketing-preview__stat--danger">
          <span>Below minimum</span>
          <strong>{summary.below_minimum}</strong>
        </div>
        <div className="marketing-preview__stat marketing-preview__stat--warning">
          <span>Above maximum</span>
          <strong>{summary.above_maximum}</strong>
        </div>
        <div className="marketing-preview__stat marketing-preview__stat--info">
          <span>Managers below reports</span>
          <strong>{summary.managers_below_reports}</strong>
        </div>
        <div className="marketing-preview__stat">
          <span>Missing ranges</span>
          <strong>{summary.missing_salary_ranges}</strong>
        </div>
        <div className="marketing-preview__stat marketing-preview__stat--info">
          <span>Pay equity gaps</span>
          <strong>{summary.pay_equity_gaps}</strong>
        </div>
      </section>

      <section className="marketing-preview__table-section">
        <div className="marketing-preview__table-header">
          <h2>Below minimum</h2>
          <span className="marketing-preview__table-count">
            {summary.below_minimum} flagged
          </span>
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
              {tableRows.map((row) => (
                <tr key={row.row_number}>
                  <td>{row.employee_name ?? row.employee_id ?? "—"}</td>
                  <td>{row.department ?? "—"}</td>
                  <td>{formatCurrency(row.salary)}</td>
                  <td>{formatCurrency(row.range_min)}</td>
                  <td className="marketing-preview__gap">
                    {formatCurrency(row.gap_to_minimum)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
