import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDemoAnalysis } from "../api";
import {
  downloadAnalysisExcel,
  downloadExecutiveSummaryPdf,
} from "../exportAnalysis";
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

const SAMPLE_PDF = "shiftworkshr-sample-executive-summary.pdf";
const SAMPLE_XLSX = "shiftworkshr-sample-analysis.xlsx";

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

function DemoMetricCard({
  title,
  label,
  value,
  meta,
}: {
  title: string;
  label: string;
  value: string | number;
  meta?: string;
}) {
  return (
    <article className="product-demo__metric metric-card">
      <h3 className="metric-card__title">{title}</h3>
      <p className="metric-card__label">{label}</p>
      <div className="metric-card__footer">
        <strong className="metric-card__value">{value}</strong>
        {meta ? <p className="metric-card__meta">{meta}</p> : null}
      </div>
    </article>
  );
}

function DemoStatCard({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className={`product-demo__stat stat-card ${tone ? `stat-card--${tone}` : ""}`}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
    </div>
  );
}

function DemoDownloads({
  result,
  compact = false,
}: {
  result: AnalysisResult;
  compact?: boolean;
}) {
  return (
    <div className={`product-demo__downloads ${compact ? "product-demo__downloads--compact" : ""}`}>
      <button
        className="button button-primary"
        type="button"
        onClick={() => downloadExecutiveSummaryPdf(result, SAMPLE_PDF)}
      >
        Download PDF
      </button>
      <button
        className="button button-secondary"
        type="button"
        onClick={() => downloadAnalysisExcel(result, SAMPLE_XLSX)}
      >
        Download Excel
      </button>
    </div>
  );
}

export function ProductDemoShowcase({ variant = "embedded" }: ProductDemoShowcaseProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<DemoTab>("overview");
  const [targetMerit, setTargetMerit] = useState("3.5");

  useEffect(() => {
    void fetchDemoAnalysis().then(setResult);
  }, []);

  useEffect(() => {
    if (!result) return;
    setTargetMerit(
      result.insights.merit_calculator.average_merit_percent?.toString() ?? "3.5",
    );
  }, [result]);

  const payrollBase = result?.insights.merit_calculator.payroll_base ?? 0;

  const projectedMeritPool = useMemo(() => {
    const percent = Number(targetMerit);
    if (!Number.isFinite(percent) || percent < 0) return 0;
    return (payrollBase * percent) / 100;
  }, [payrollBase, targetMerit]);

  const shellClass = [
    "product-demo",
    variant === "embedded" ? "product-demo--embedded" : "product-demo--full",
  ].join(" ");

  if (!result) {
    return <p className="product-demo__message">Loading sample analysis…</p>;
  }

  const { insights, summary } = result;
  const combinedBudget = insights.cost_metrics.total_gap_to_minimum + projectedMeritPool;
  const meritPercent = Number(targetMerit) || 0;
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
    { label: "Managers below reports", value: summary.managers_below_reports, tone: "info" },
    { label: "Missing salary ranges", value: summary.missing_salary_ranges, tone: "" },
    { label: "Pay equity gaps", value: summary.pay_equity_gaps, tone: "info" },
    { label: "Outlier merit increases", value: summary.outlier_merit_increases, tone: "" },
    {
      label: "Avg penetration",
      value:
        summary.average_penetration != null ? `${summary.average_penetration}%` : "—",
      tone: "",
    },
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
        <div className="product-demo__topbar-actions">
          {variant === "full" ? <DemoDownloads result={result} compact /> : null}
          <span className="product-demo__chip">Demo data</span>
        </div>
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
            <section className="product-demo__summary">
              <div className="product-demo__summary-top">
                <h2>Executive summary</h2>
                <span className={`pill risk-${insights.executive_summary.risk_level}`}>
                  {insights.executive_summary.risk_level} risk
                </span>
              </div>
              <p className="product-demo__headline">{insights.executive_summary.headline}</p>
              <ul className="product-demo__bullets">
                {insights.executive_summary.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <p className="product-demo__export-note">
                Same Excel export as production. Use Executive PDF in the full analyzer for a
                leadership-ready summary.
              </p>
              <DemoDownloads result={result} />
            </section>

            <section
              className="product-demo__metrics card-grid card-grid--4"
              aria-label="Key metrics"
            >
              {metrics.map((metric) => (
                <DemoMetricCard key={metric.title} {...metric} />
              ))}
            </section>

            <section
              className="product-demo__stats card-grid card-grid--4"
              aria-label="Issue counts"
            >
              {stats.map((stat) => (
                <DemoStatCard key={stat.label} {...stat} />
              ))}
            </section>
          </>
        ) : null}

        {activeTab === "issues" ? (
          <>
            <section
              className="product-demo__metrics product-demo__metrics--compact card-grid card-grid--2"
              aria-label="Issue highlights"
            >
              <DemoMetricCard
                title="Below minimum"
                label="Employees under range floor"
                value={summary.below_minimum}
                meta="Requires merit or adjustment review"
              />
              <DemoMetricCard
                title="Above maximum"
                label="Employees over range ceiling"
                value={summary.above_maximum}
                meta="Check approvals and exceptions"
              />
              <DemoMetricCard
                title="Compression"
                label="Same-level pay spread issues"
                value={summary.compression_issues}
                meta="Structural range or level review"
              />
              <DemoMetricCard
                title="Manager inversions"
                label="Managers paid below reports"
                value={summary.managers_below_reports}
                meta="Leadership escalation recommended"
              />
            </section>

            <section className="product-demo__table-section">
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
            <section className="product-demo__summary">
              <div className="product-demo__summary-top">
                <h2>Pay equity signals</h2>
              </div>
              <p className="product-demo__headline">
                Median pay comparisons by gender and race at the same job level.
              </p>
              <p className="product-demo__note">{result.pay_equity.disclaimer}</p>
            </section>

            <section
              className="product-demo__metrics product-demo__metrics--equity card-grid card-grid--2"
              aria-label="Pay equity gaps"
            >
              {payGaps.length > 0 ? (
                payGaps.map((gap) => (
                  <DemoMetricCard
                    key={`${gap.dimension}-${gap.higher_paid_group}-${gap.lower_paid_group}-${gap.scope}`}
                    title={`${gap.higher_paid_group} vs. ${gap.lower_paid_group}`}
                    label={`${gap.scope} · ${gap.dimension}`}
                    value={formatPercent(gap.gap_percent)}
                    meta={`${formatCurrency(gap.higher_median)} vs. ${formatCurrency(gap.lower_median)}`}
                  />
                ))
              ) : (
                <article className="product-demo__metric product-demo__metric--wide metric-card">
                  <h3 className="metric-card__title">No gaps in sample</h3>
                  <p className="metric-card__label">
                    Upload data with gender and race columns to populate this view.
                  </p>
                  <p className="metric-card__meta">&nbsp;</p>
                </article>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "budget" ? (
          <>
            <section
              className="product-demo__metrics product-demo__metrics--triple card-grid card-grid--3"
              aria-label="Budget impact"
            >
              <DemoMetricCard
                title="Cost to minimum"
                label="Dollars to bring employees to range floor"
                value={formatCurrency(insights.cost_metrics.total_gap_to_minimum)}
                meta={`${insights.cost_metrics.employees_below_minimum} employees flagged`}
              />
              <DemoMetricCard
                title="Budget impact"
                label="Remediation plus merit pool exposure"
                value={formatCurrency(combinedBudget)}
                meta={`Minimum ${formatCurrency(insights.budget_impact.cost_to_minimum)}`}
              />
              <DemoMetricCard
                title="Compa-ratio"
                label="Average vs. range midpoint"
                value={formatPercent(insights.compa_ratio.average_compa_ratio)}
                meta={`${insights.compa_ratio.below_90_percent} below 90%`}
              />
            </section>

            <section className="product-demo__merit metric-card metric-card--input">
              <h3 className="metric-card__title">Merit pool</h3>
              <label className="metric-card__label" htmlFor="demo-target-merit">
                Target merit increase %
              </label>
              <div className="metric-card__controls">
                <input
                  id="demo-target-merit"
                  className="merit-input metric-card__input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={targetMerit}
                  onChange={(event) => setTargetMerit(event.target.value)}
                />
              </div>
              <div className="metric-card__footer">
                <strong className="metric-card__value">
                  {formatCurrency(projectedMeritPool)}
                </strong>
                <p className="metric-card__meta">
                  Based on {formatCurrency(insights.merit_calculator.payroll_base)} eligible
                  payroll
                  {insights.merit_calculator.average_merit_percent != null
                    ? ` · file average ${insights.merit_calculator.average_merit_percent}%`
                    : ""}
                </p>
              </div>
            </section>

            <section className="product-demo__summary">
              <div className="product-demo__summary-top">
                <h2>Planning note</h2>
              </div>
              <p className="product-demo__headline">{insights.budget_impact.note}</p>
              <p className="product-demo__note">
                Total modeled budget exposure:{" "}
                <strong>{formatCurrency(insights.budget_impact.total_budget_impact)}</strong>
              </p>
            </section>
          </>
        ) : null}
      </div>

      {variant === "embedded" ? (
        <footer className="product-demo__footer">
          <Link to="/sample-preview">See full analyzer</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/#pricing">Get full access</Link>
        </footer>
      ) : null}
    </div>
  );
}
