import type { AnalysisResult, AnalysisTab } from "../types";
import { PENETRATION_BAND_LABELS } from "../types";
import { downloadAnalysisExcel, downloadAnalysisPdf } from "../exportAnalysis";
import { InsightsPanel } from "./InsightsPanel";
import { PayEquityPanel, payEquityTabCount } from "./PayEquityPanel";

interface ResultsDashboardProps {
  result: AnalysisResult;
  activeTab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
}

const TABS: Array<{ id: AnalysisTab; label: string; count: (result: AnalysisResult) => number }> =
  [
    { id: "below_minimum", label: "Below Minimum", count: (r) => r.summary.below_minimum },
    { id: "above_maximum", label: "Above Maximum", count: (r) => r.summary.above_maximum },
    { id: "duplicate_ids", label: "Duplicate IDs", count: (r) => r.summary.duplicate_ids },
    { id: "range_penetration", label: "Range Penetration", count: (r) => r.range_penetration.length },
    { id: "compression", label: "Salary Compression", count: (r) => r.summary.compression_issues },
    {
      id: "pay_equity",
      label: "Pay Equity",
      count: (r) => payEquityTabCount(r),
    },
    {
      id: "managers_below_reports",
      label: "Managers Below Reports",
      count: (r) => r.summary.managers_below_reports,
    },
    {
      id: "missing_bonus_targets",
      label: "Missing Bonus Targets",
      count: (r) => r.summary.missing_bonus_targets,
    },
    {
      id: "missing_salary_ranges",
      label: "Missing Salary Ranges",
      count: (r) => r.summary.missing_salary_ranges,
    },
    {
      id: "invalid_effective_dates",
      label: "Invalid Effective Dates",
      count: (r) => r.summary.invalid_effective_dates,
    },
    {
      id: "outlier_merit_increases",
      label: "Outlier Merit Increases",
      count: (r) => r.summary.outlier_merit_increases,
    },
    { id: "compa_ratio", label: "Compa-Ratio", count: (r) => r.compa_ratios.length },
    { id: "missing_data", label: "Missing Data", count: (r) => r.summary.missing_data },
  ];

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function EmployeeTable({
  rows,
  showPenetration = false,
}: {
  rows: AnalysisResult["below_minimum"];
  showPenetration?: boolean;
}) {
  if (rows.length === 0) {
    return <div className="empty-state">No issues found in this category.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Row</th>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Level</th>
            <th>Salary</th>
            <th>Range Min</th>
            <th>Range Max</th>
            {showPenetration ? <th>Penetration</th> : null}
            {showPenetration ? <th>Band</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.row_number}-${row.employee_id}`}>
              <td>{row.row_number}</td>
              <td>{row.employee_id ?? "—"}</td>
              <td>{row.employee_name ?? "—"}</td>
              <td>{row.department ?? "—"}</td>
              <td>{row.job_level ?? "—"}</td>
              <td>{formatCurrency(row.salary)}</td>
              <td>{formatCurrency(row.range_min)}</td>
              <td>{formatCurrency(row.range_max)}</td>
              {showPenetration ? (
                <td>
                  {row.range_penetration != null ? `${row.range_penetration}%` : "—"}
                </td>
              ) : null}
              {showPenetration ? (
                <td>
                  {row.penetration_band
                    ? PENETRATION_BAND_LABELS[row.penetration_band] ?? row.penetration_band
                    : "—"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsDashboard({
  result,
  activeTab,
  onTabChange,
}: ResultsDashboardProps) {
  return (
    <>
      <div className="panel-header" style={{ marginBottom: 16 }}>
        <h2>Analysis results</h2>
        <div className="download-actions">
          <button
            className="button button-primary"
            onClick={() => downloadAnalysisExcel(result)}
          >
            Download Excel
          </button>
          <button
            className="button button-secondary"
            onClick={() => downloadAnalysisPdf(result)}
          >
            Download PDF
          </button>
        </div>
      </div>

      <InsightsPanel result={result} />
      <div className="summary-grid">
        <div className="summary-card">
          <span>Total rows</span>
          <strong>{result.summary.total_rows}</strong>
        </div>
        <div className="summary-card danger">
          <span>Below minimum</span>
          <strong>{result.summary.below_minimum}</strong>
        </div>
        <div className="summary-card warning">
          <span>Above maximum</span>
          <strong>{result.summary.above_maximum}</strong>
        </div>
        <div className="summary-card info">
          <span>Managers below reports</span>
          <strong>{result.summary.managers_below_reports}</strong>
        </div>
        <div className="summary-card">
          <span>Missing salary ranges</span>
          <strong>{result.summary.missing_salary_ranges}</strong>
        </div>
        <div className="summary-card info">
          <span>Pay equity gaps</span>
          <strong>{result.summary.pay_equity_gaps}</strong>
        </div>
        <div className="summary-card">
          <span>Outlier merit increases</span>
          <strong>{result.summary.outlier_merit_increases}</strong>
        </div>
        <div className="summary-card">
          <span>Avg penetration</span>
          <strong>
            {result.summary.average_penetration != null
              ? `${result.summary.average_penetration}%`
              : "—"}
          </strong>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label} ({tab.count(result)})
          </button>
        ))}
      </div>

      {activeTab === "below_minimum" ? <EmployeeTable rows={result.below_minimum} /> : null}
      {activeTab === "above_maximum" ? <EmployeeTable rows={result.above_maximum} /> : null}

      {activeTab === "duplicate_ids" ? (
        result.duplicate_ids.length === 0 ? (
          <div className="empty-state">No duplicate employee IDs found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Occurrences</th>
                  <th>Excel Rows</th>
                </tr>
              </thead>
              <tbody>
                {result.duplicate_ids.map((group) => (
                  <tr key={group.employee_id}>
                    <td>{group.employee_id}</td>
                    <td>{group.count}</td>
                    <td>{group.rows.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "range_penetration" ? (
        <>
          <p className="file-meta" style={{ marginBottom: 16 }}>
            Range penetration = (salary − range min) ÷ (range max − range min) × 100
          </p>
          <EmployeeTable rows={result.range_penetration} showPenetration />
        </>
      ) : null}

      {activeTab === "compression" ? (
        result.compression.length === 0 ? (
          <div className="empty-state">No salary compression patterns detected.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Employee</th>
                  <th>Row</th>
                </tr>
              </thead>
              <tbody>
                {result.compression.map((issue, index) => (
                  <tr key={`${issue.issue_type}-${index}`}>
                    <td>
                      <span className="pill pill-warning">{issue.issue_type}</span>
                    </td>
                    <td>{issue.description}</td>
                    <td>{issue.employee_name ?? issue.employee_id ?? "—"}</td>
                    <td>{issue.row_number ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "managers_below_reports" ? (
        result.managers_below_reports.length === 0 ? (
          <div className="empty-state">No managers paid below direct reports.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Manager</th>
                  <th>Manager Pay</th>
                  <th>Direct Report</th>
                  <th>Report Pay</th>
                  <th>Gap</th>
                </tr>
              </thead>
              <tbody>
                {result.managers_below_reports.map((issue) => (
                  <tr key={`${issue.row_number}-${issue.report_id}`}>
                    <td>{issue.row_number}</td>
                    <td>
                      {issue.manager_name ?? issue.manager_id} ({issue.manager_id})
                    </td>
                    <td>{formatCurrency(issue.manager_salary)}</td>
                    <td>
                      {issue.report_name ?? issue.report_id} ({issue.report_id})
                    </td>
                    <td>{formatCurrency(issue.report_salary)}</td>
                    <td>{formatCurrency(issue.pay_gap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "missing_bonus_targets" ? (
        result.missing_bonus_targets.length === 0 ? (
          <div className="empty-state">All rows include bonus targets.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {result.missing_bonus_targets.map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>{row.employee_id ?? "—"}</td>
                    <td>{row.employee_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "missing_salary_ranges" ? (
        result.missing_salary_ranges.length === 0 ? (
          <div className="empty-state">All rows include salary range minimum and maximum.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Missing Fields</th>
                </tr>
              </thead>
              <tbody>
                {result.missing_salary_ranges.map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>{row.employee_id ?? "—"}</td>
                    <td>{row.employee_name ?? "—"}</td>
                    <td>{row.missing_fields.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "invalid_effective_dates" ? (
        result.invalid_effective_dates.length === 0 ? (
          <div className="empty-state">All effective dates are valid.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Effective Date</th>
                  <th>Issue</th>
                </tr>
              </thead>
              <tbody>
                {result.invalid_effective_dates.map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>{row.employee_id ?? "—"}</td>
                    <td>{row.employee_name ?? "—"}</td>
                    <td>{row.effective_date ?? "—"}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "outlier_merit_increases" ? (
        result.outlier_merit_increases.length === 0 ? (
          <div className="empty-state">No outlier merit increases detected.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Merit Increase</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.outlier_merit_increases.map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>{row.employee_id ?? "—"}</td>
                    <td>{row.employee_name ?? "—"}</td>
                    <td>{row.merit_increase}%</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "compa_ratio" ? (
        result.compa_ratios.length === 0 ? (
          <div className="empty-state">No compa-ratio values available.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Salary</th>
                  <th>Range Midpoint</th>
                  <th>Compa-Ratio</th>
                </tr>
              </thead>
              <tbody>
                {result.compa_ratios.map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>{row.employee_id ?? "—"}</td>
                    <td>{row.employee_name ?? "—"}</td>
                    <td>{formatCurrency(row.salary)}</td>
                    <td>{formatCurrency(row.range_midpoint)}</td>
                    <td>{row.compa_ratio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "pay_equity" ? <PayEquityPanel payEquity={result.pay_equity} /> : null}

      {activeTab === "missing_data" ? (
        result.missing_data.length === 0 ? (
          <div className="empty-state">All required compensation fields are present.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Missing Fields</th>
                </tr>
              </thead>
              <tbody>
                {result.missing_data.map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>{row.employee_id ?? "—"}</td>
                    <td>{row.employee_name ?? "—"}</td>
                    <td>{row.missing_fields.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </>
  );
}
