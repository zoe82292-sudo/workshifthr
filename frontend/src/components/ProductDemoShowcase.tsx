import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDemoAnalysis } from "../api";
import type { AnalysisResult } from "../types";
import { LogoMark } from "./LogoMark";

type DemoTab = "overview" | "issues" | "pay-equity" | "budget";

type ProductDemoShowcaseProps = {
  variant?: "embedded" | "full";
};

const TABS: Array<{ id: DemoTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "issues", label: "Flagged issues" },
  { id: "pay-equity", label: "Pay equity" },
  { id: "budget", label: "Budget impact" },
];

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

export function ProductDemoShowcase({ variant = "embedded" }: ProductDemoShowcaseProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DemoTab>("overview");

  useEffect(() => {
    void fetchDemoAnalysis()
      .then(setResult)
      .catch(() => setError("Unable to load the sample analysis. Please refresh and try again."));
  }, []);

  const shellClass = [
    "product-demo",
    variant === "embedded" ? "product-demo--embedded" : "product-demo--full",
  ].join(" ");

  if (error) {
    return <p className="product-demo__message product-demo__message--error">{error}</p>;
  }

  if (!result) {
    return <p className="product-demo__message">Loading sample analysis…</p>;
  }

  const { insights, summary } = result;
  const meritPercent = insights.merit_calculator.average_merit_percent ?? 3.5;
  const projectedMeritPool =
    (insights.merit_calculator.payroll_base * meritPercent) / 100;
  const combinedBudget =
    insights.cost_metrics.total_gap_to_minimum + projectedMeritPool;
  const issueRows = result.below_minimum.slice(0, 4);
  const payGaps = [
    ...result.pay_equity.gender_gaps.slice(0, 2),
    ...result.pay_equity.race_gaps.slice(0, 2),
  ].slice(0, 4);

  const metrics = [
    {
      title: "Cost to minimum",
      label: "Dollars to bring employees to range floor",
      value: formatCurrency(insights.cost_metrics.total_gap_to_minimum),
      meta: `${insights.cost_metrics.employees_below_minimum} employees flagged`,
    },
    {
      title: "Budget impact",
      label: "Remediation plus merit pool exposure",
      value: formatCurrency(combinedBudget),
      meta: `Minimum ${formatCurrency(insights.budget_impact.cost_to_minimum)}`,
    },
    {
      title: "Merit pool",
      label: `Projected at ${meritPercent}% increase`,
      value: formatCurrency(projectedMeritPool),
      meta: `${formatCurrency(insights.merit_calculator.payroll_base)} eligible payroll`,
    },
    {
      title: "Compa-ratio",
      label: "Average vs. range midpoint",
      value: formatPercent(insights.compa_ratio.average_compa_ratio),
      meta: `${insights.compa_ratio.below_90_percent} below 90%`,
    },
  ];

  const stats = [
    { label: "Total rows", value: summary.total_rows, tone: "" },
    { label: "Below minimum", value: summary.below_minimum, tone: "danger" },
    { label: "Above maximum", value: summary.above_maximum, tone: "warning" },
    { label: "Compression", value: summary.compression_issues, tone: "info" },
    { label: "Mgr below reports", value: summary.managers_below_reports, tone: "info" },
    { label: "Pay equity gaps", value: summary.pay_equity_gaps, tone: "info" },
  ];

  return (
    <div className={shellClass}>
      <header className="product-demo__topbar">
        <div className="product-demo__brand">
          <LogoMark className="product-demo__mark" title="ShiftWorksHR" />
          <div>
            <p className="product-demo__eyebrow">Compensation analysis</p>
            <p className="product-demo__title">Sample results</p>
          </div>
        </div>
        <span className="product-demo__chip">Demo data</span>
      </header>

      <nav className="product-demo__tabs" aria-label="Demo views">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`product-demo__tab ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="product-demo__body">
        {activeTab === "overview" ? (
          <>
            <section className="product-demo__summary panel">
              <div className="product-demo__summary-top">
                <h2>Executive summary</h2>
                <span className={`pill risk-${insights.executive_summary.risk_level}`}>
                  {insights.executive_summary.risk_level} risk
                </span>
              </div>
              <p className="product-demo__headline">{insights.executive_summary.headline}</p>
              <ul className="product-demo__bullets">
                {insights.executive_summary.bullets.slice(0, 3).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </section>

            <section className="product-demo__metrics" aria-label="Key metrics">
              {metrics.map((metric) => (
                <article className="product-demo__metric panel" key={metric.title}>
                  <h3>{metric.title}</h3>
                  <p className="product-demo__metric-label">{metric.label}</p>
                  <strong className="product-demo__metric-value">{metric.value}</strong>
                  <p className="product-demo__metric-meta">{metric.meta}</p>
                </article>
              ))}
            </section>

            <section className="product-demo__stats" aria-label="Issue counts">
              {stats.map((stat) => (
                <div
                  className={`product-demo__stat ${stat.tone ? `product-demo__stat--${stat.tone}` : ""}`}
                  key={stat.label}
                >
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </section>
          </>
        ) : null}

        {activeTab === "issues" ? (
          <>
            <section className="product-demo__metrics product-demo__metrics--compact" aria-label="Issue highlights">
              <article className="product-demo__metric panel">
                <h3>Below minimum</h3>
                <p className="product-demo__metric-label">Employees under range floor</p>
                <strong className="product-demo__metric-value">{summary.below_minimum}</strong>
                <p className="product-demo__metric-meta">Requires merit or adjustment review</p>
              </article>
              <article className="product-demo__metric panel">
                <h3>Above maximum</h3>
                <p className="product-demo__metric-label">Employees over range ceiling</p>
                <strong className="product-demo__metric-value">{summary.above_maximum}</strong>
                <p className="product-demo__metric-meta">Check approvals and exceptions</p>
              </article>
              <article className="product-demo__metric panel">
                <h3>Compression</h3>
                <p className="product-demo__metric-label">Same-level pay spread issues</p>
                <strong className="product-demo__metric-value">{summary.compression_issues}</strong>
                <p className="product-demo__metric-meta">Structural range or level review</p>
              </article>
              <article className="product-demo__metric panel">
                <h3>Manager inversions</h3>
                <p className="product-demo__metric-label">Managers paid below reports</p>
                <strong className="product-demo__metric-value">{summary.managers_below_reports}</strong>
                <p className="product-demo__metric-meta">Leadership escalation recommended</p>
              </article>
            </section>

            <section className="product-demo__table-section panel">
              <div className="product-demo__table-header">
                <h2>Below minimum</h2>
                <span className="product-demo__table-count">{summary.below_minimum} flagged</span>
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
                    {issueRows.map((row) => (
                      <tr key={row.row_number}>
                        <td>{row.employee_name ?? row.employee_id ?? "—"}</td>
                        <td>{row.department ?? "—"}</td>
                        <td>{formatCurrency(row.salary)}</td>
                        <td>{formatCurrency(row.range_min)}</td>
                        <td className="product-demo__gap">{formatCurrency(row.gap_to_minimum)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "pay-equity" ? (
          <>
            <section className="product-demo__summary panel">
              <div className="product-demo__summary-top">
                <h2>Pay equity signals</h2>
              </div>
              <p className="product-demo__headline">
                Median pay comparisons by gender and race at the same job level.
              </p>
              <p className="product-demo__note">{result.pay_equity.disclaimer}</p>
            </section>

            <section className="product-demo__metrics product-demo__metrics--equity" aria-label="Pay equity gaps">
              {payGaps.length > 0 ? (
                payGaps.map((gap) => (
                  <article
                    className="product-demo__metric panel"
                    key={`${gap.dimension}-${gap.higher_paid_group}-${gap.lower_paid_group}-${gap.scope}`}
                  >
                    <h3>
                      {gap.higher_paid_group} vs. {gap.lower_paid_group}
                    </h3>
                    <p className="product-demo__metric-label">
                      {gap.scope} · {gap.dimension}
                    </p>
                    <strong className="product-demo__metric-value">
                      {formatPercent(gap.gap_percent)}
                    </strong>
                    <p className="product-demo__metric-meta">
                      {formatCurrency(gap.higher_median)} vs. {formatCurrency(gap.lower_median)}
                    </p>
                  </article>
                ))
              ) : (
                <article className="product-demo__metric panel product-demo__metric--wide">
                  <h3>No gaps in sample</h3>
                  <p className="product-demo__metric-label">
                    Upload data with gender and race columns to populate this view.
                  </p>
                </article>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "budget" ? (
          <section className="product-demo__metrics" aria-label="Budget impact">
            {metrics.map((metric) => (
              <article className="product-demo__metric panel" key={`budget-${metric.title}`}>
                <h3>{metric.title}</h3>
                <p className="product-demo__metric-label">{metric.label}</p>
                <strong className="product-demo__metric-value">{metric.value}</strong>
                <p className="product-demo__metric-meta">{metric.meta}</p>
              </article>
            ))}
            <article className="product-demo__metric panel product-demo__metric--wide">
              <h3>Planning note</h3>
              <p className="product-demo__metric-label">{insights.budget_impact.note}</p>
              <strong className="product-demo__metric-value">
                {formatCurrency(insights.budget_impact.total_budget_impact)}
              </strong>
              <p className="product-demo__metric-meta">Total modeled budget exposure</p>
            </article>
          </section>
        ) : null}
      </div>

      {variant === "embedded" ? (
        <footer className="product-demo__footer">
          <Link to="/sample-preview">Open expanded demo</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/#pricing">Get full access</Link>
        </footer>
      ) : null}
    </div>
  );
}
