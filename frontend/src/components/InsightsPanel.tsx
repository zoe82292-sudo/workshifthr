import { useMemo, useState } from "react";
import type { AnalysisResult } from "../types";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface InsightsPanelProps {
  result: AnalysisResult;
}

export function InsightsPanel({ result }: InsightsPanelProps) {
  const { insights } = result;
  const defaultMerit =
    insights.merit_calculator.average_merit_percent?.toString() ?? "3.5";
  const [targetMerit, setTargetMerit] = useState(defaultMerit);

  const projectedMeritPool = useMemo(() => {
    const percent = Number(targetMerit);
    if (!Number.isFinite(percent) || percent < 0) return 0;
    return (insights.merit_calculator.payroll_base * percent) / 100;
  }, [insights.merit_calculator.payroll_base, targetMerit]);

  const combinedBudget = insights.cost_metrics.total_gap_to_minimum + projectedMeritPool;

  return (
    <>
      <section className="insights-panel">
        <div className="panel-header">
          <h2>Executive Summary</h2>
          <span className={`pill risk-${insights.executive_summary.risk_level}`}>
            {insights.executive_summary.risk_level} risk
          </span>
        </div>
        <p className="executive-headline">{insights.executive_summary.headline}</p>
        <ul className="executive-list">
          {insights.executive_summary.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section className="insights-grid">
        <div className="insight-card">
          <h3>Cost to minimum</h3>
          <p className="insight-label">Dollars to bring employees to range floor</p>
          <strong className="insight-value">
            {formatCurrency(insights.cost_metrics.total_gap_to_minimum)}
          </strong>
          <p className="insight-meta">
            {insights.cost_metrics.employees_below_minimum} employees affected · average gap{" "}
            {formatCurrency(insights.cost_metrics.average_gap_to_minimum)}
          </p>
        </div>

        <div className="insight-card">
          <h3>Budget impact</h3>
          <p className="insight-label">Remediation plus merit pool exposure</p>
          <strong className="insight-value">{formatCurrency(combinedBudget)}</strong>
          <p className="insight-meta">
            Minimum adjustments {formatCurrency(insights.budget_impact.cost_to_minimum)} · merit
            pool {formatCurrency(projectedMeritPool)}
          </p>
        </div>

        <div className="insight-card">
          <h3>Merit pool</h3>
          <label className="insight-label" htmlFor="target-merit">
            Target merit increase %
          </label>
          <input
            id="target-merit"
            className="merit-input"
            type="number"
            min="0"
            step="0.1"
            value={targetMerit}
            onChange={(event) => setTargetMerit(event.target.value)}
          />
          <strong className="insight-value">{formatCurrency(projectedMeritPool)}</strong>
          <p className="insight-meta">
            Based on {formatCurrency(insights.merit_calculator.payroll_base)} eligible payroll
            {insights.merit_calculator.average_merit_percent != null
              ? ` · file average ${insights.merit_calculator.average_merit_percent}%`
              : ""}
          </p>
        </div>

        <div className="insight-card">
          <h3>Compa-ratio</h3>
          <p className="insight-label">Average vs. range midpoint</p>
          <strong className="insight-value">
            {insights.compa_ratio.average_compa_ratio != null
              ? `${insights.compa_ratio.average_compa_ratio}%`
              : "—"}
          </strong>
          <p className="insight-meta">
            Below 90%: {insights.compa_ratio.below_90_percent} · 90–110%:{" "}
            {insights.compa_ratio.between_90_and_110} · Above 110%:{" "}
            {insights.compa_ratio.above_110_percent}
          </p>
        </div>
      </section>
    </>
  );
}
