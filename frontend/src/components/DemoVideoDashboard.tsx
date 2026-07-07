import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";
import type { AnalysisResult, EmployeeRecord } from "../types";

type DemoVideoDashboardProps = {
  focus: "overview" | "table";
};

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function DemoVideoOverview({ result }: { result: AnalysisResult }) {
  const { summary, insights } = result;
  const exec = insights.executive_summary;
  const budget = insights.budget_impact;

  const metrics = [
    { label: "Review queue", value: String(result.review_queue.total_items) },
    { label: "Below minimum", value: String(summary.below_minimum), tone: "danger" },
    { label: "Mgr inversions", value: String(summary.managers_below_reports), tone: "danger" },
    { label: "Budget exposure", value: formatMoney(budget.total_budget_impact) },
  ];

  return (
    <div className="demo-video-app">
      <header className="demo-video-app__header">
        <div>
          <p className="demo-video-app__eyebrow">compensation-export.xlsx</p>
          <h2>Analysis results</h2>
        </div>
        <div className="demo-video-app__exports">
          <span className="demo-video-app__export demo-video-app__export--secondary">PDF summary</span>
          <span className="demo-video-app__export demo-video-app__export--primary">Excel report</span>
        </div>
      </header>

      <section className="demo-video-app__exec panel">
        <div className="demo-video-app__exec-top">
          <h3>Executive summary</h3>
          <span className={`pill risk-${exec.risk_level}`}>{exec.risk_level} risk</span>
        </div>
        <p className="demo-video-app__headline">{exec.headline}</p>
        <ul className="demo-video-app__bullets">
          {exec.bullets.slice(0, 3).map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <div className="demo-video-app__metrics">
        {metrics.map((metric) => (
          <article
            className={`demo-video-app__metric${metric.tone ? ` demo-video-app__metric--${metric.tone}` : ""}`}
            key={metric.label}
          >
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function DemoVideoTable({ result }: { result: AnalysisResult }) {
  const rows = result.below_minimum.slice(0, 5);

  return (
    <div className="demo-video-app">
      <header className="demo-video-app__header">
        <div>
          <p className="demo-video-app__eyebrow">compensation-export.xlsx</p>
          <h2>Analysis results</h2>
        </div>
        <div className="demo-video-app__exports">
          <span className="demo-video-app__export demo-video-app__export--secondary">PDF summary</span>
          <span className="demo-video-app__export demo-video-app__export--primary">Excel report</span>
        </div>
      </header>

      <div className="demo-video-app__tabs" role="tablist" aria-label="Issue categories">
        <span className="demo-video-app__tab">Review queue ({result.review_queue.total_items})</span>
        <span className="demo-video-app__tab demo-video-app__tab--active">
          Below minimum ({result.below_minimum.length})
        </span>
        <span className="demo-video-app__tab">Compression ({result.summary.compression_issues})</span>
        <span className="demo-video-app__tab">Mgr inversions ({result.summary.managers_below_reports})</span>
      </div>

      <section className="demo-video-app__table-panel panel">
        <div className="demo-video-app__table-head">
          <h3>Below range minimum</h3>
          <span>{rows.length} employees</span>
        </div>
        <table className="demo-video-app__table">
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
            {rows.map((row: EmployeeRecord) => (
              <tr key={row.employee_id}>
                <td>{row.employee_name}</td>
                <td>{row.department}</td>
                <td>{formatMoney(row.salary ?? 0)}</td>
                <td>{formatMoney(row.range_min ?? 0)}</td>
                <td className="demo-video-app__gap">{formatMoney(row.gap_to_minimum ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function DemoVideoDashboard({ focus }: DemoVideoDashboardProps) {
  const result = getBundledDemoAnalysis();
  return focus === "overview" ? (
    <DemoVideoOverview result={result} />
  ) : (
    <DemoVideoTable result={result} />
  );
}
