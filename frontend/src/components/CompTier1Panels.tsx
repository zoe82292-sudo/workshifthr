import { TrialName } from "../trialDisplay";
import type {
  CompaPenetrationSummary,
  CurrencyReport,
  EmployeeTypeReport,
  GeoPayPolicyReport,
  MeritMatrixReport,
  MidpointProgressionReport,
  NewHirePlacementReport,
  PerformanceMeritReport,
  RangeStructureReport,
  TotalCashCompReport,
} from "../types";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function CompaStatsTable({ rows, title }: { rows: CompaPenetrationSummary["by_level"]; title: string }) {
  if (rows.length === 0) return null;
  return (
    <section className="equity-section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Headcount</th>
              <th>Avg compa</th>
              <th>Median compa</th>
              <th>Avg penetration</th>
              <th>&lt;90%</th>
              <th>90–110%</th>
              <th>&gt;110%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.group_key}>
                <td>{row.group_key}</td>
                <td>{row.headcount}</td>
                <td>{row.average_compa != null ? `${row.average_compa}%` : "—"}</td>
                <td>{row.median_compa != null ? `${row.median_compa}%` : "—"}</td>
                <td>{row.average_penetration != null ? `${row.average_penetration}%` : "—"}</td>
                <td>{row.below_90}</td>
                <td>{row.between_90_110}</td>
                <td>{row.above_110}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CompaPenetrationSummaryPanel({ summary }: { summary: CompaPenetrationSummary }) {
  if (!summary.available) {
    return (
      <div className="empty-state">
        Upload salary and range data to see compa-ratio and penetration summaries by level and department.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{summary.disclaimer}</p>
      <CompaStatsTable rows={summary.by_level} title="By job level" />
      <CompaStatsTable rows={summary.by_department} title="By department" />
      <CompaStatsTable rows={summary.by_level_department} title="By level + department" />
    </div>
  );
}

export function MeritMatrixPanel({ report }: { report: MeritMatrixReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include <strong>Merit Increase %</strong> and compa-ratio data to check merit against default
        compa bands.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      {report.bands.length > 0 ? (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Compa band</th>
                <th>Guideline merit %</th>
              </tr>
            </thead>
            <tbody>
              {report.bands.map((band) => (
                <tr key={band.label}>
                  <td>{band.label}</td>
                  <td>
                    {band.merit_min}% – {band.merit_max}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {report.flags.length === 0 ? (
        <div className="empty-state">All merit increases fall within default matrix bands.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Level</th>
                <th>Compa</th>
                <th>Merit %</th>
                <th>Band</th>
                <th>Guideline</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {report.flags.map((row) => (
                <tr key={row.row_number}>
                  <td><TrialName value={row.employee_name} fallback={row.employee_id ?? "—"} /></td>
                  <td>{row.department ?? "—"}</td>
                  <td>{row.job_level ?? "—"}</td>
                  <td>{row.compa_ratio}%</td>
                  <td>{row.merit_increase}%</td>
                  <td>{row.matrix_band}</td>
                  <td>
                    {row.expected_merit_min}% – {row.expected_merit_max}%
                  </td>
                  <td>{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RangeStructurePanel({ report }: { report: RangeStructureReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include <strong>Job Level</strong> and salary ranges to validate range structure.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      {report.level_ranges.length > 0 ? (
        <>
          <h3>Range by level</h3>
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Min</th>
                  <th>Mid</th>
                  <th>Max</th>
                  <th>Width %</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {report.level_ranges.map((row) => (
                  <tr key={row.job_level}>
                    <td>{row.job_level}</td>
                    <td>{formatCurrency(row.range_min)}</td>
                    <td>{row.range_mid != null ? formatCurrency(row.range_mid) : "—"}</td>
                    <td>{formatCurrency(row.range_max)}</td>
                    <td>{row.range_width_percent != null ? `${row.range_width_percent}%` : "—"}</td>
                    <td>{row.employee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {report.issues.length === 0 ? (
        <div className="empty-state">No range structure issues detected.</div>
      ) : (
        <>
          <h3>Issues</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Level</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {report.issues.map((issue, index) => (
                  <tr key={`${issue.issue_type}-${issue.job_level}-${index}`}>
                    <td>
                      <span className="pill pill-warning">{issue.issue_type.replace(/_/g, " ")}</span>
                    </td>
                    <td>{issue.job_level}</td>
                    <td>{issue.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function TotalCashCompPanel({ report }: { report: TotalCashCompReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Map a <strong>Bonus Target</strong> column to calculate total cash comp (base + target bonus).
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      {report.average_tcc != null ? (
        <p className="file-meta">
          Average total cash comp: <strong>{formatCurrency(report.average_tcc)}</strong>
        </p>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Base</th>
              <th>Bonus target</th>
              <th>Target bonus $</th>
              <th>Total cash</th>
              <th>Base compa</th>
              <th>TCC compa</th>
            </tr>
          </thead>
          <tbody>
            {report.employees.map((row) => (
              <tr key={row.row_number}>
                <td><TrialName value={row.employee_name} fallback={row.employee_id ?? "—"} /></td>
                <td>{row.department ?? "—"}</td>
                <td>{formatCurrency(row.base_salary)}</td>
                <td>{row.bonus_target_percent}%</td>
                <td>{formatCurrency(row.target_bonus_amount)}</td>
                <td>{formatCurrency(row.total_cash_comp)}</td>
                <td>{row.base_compa_ratio != null ? `${row.base_compa_ratio}%` : "—"}</td>
                <td>{row.tcc_compa_ratio != null ? `${row.tcc_compa_ratio}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NewHirePlacementPanel({ report }: { report: NewHirePlacementReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include <strong>Hire Date</strong> to review new hire range placement.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      <p className="file-meta">
        {report.below_range_count} of {report.employees.length} recent hires are below range minimum.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Hire date</th>
              <th>Days</th>
              <th>Salary</th>
              <th>Compa</th>
              <th>Penetration</th>
              <th>Placement</th>
            </tr>
          </thead>
          <tbody>
            {report.employees.map((row) => (
              <tr key={row.row_number}>
                <td><TrialName value={row.employee_name} fallback={row.employee_id ?? "—"} /></td>
                <td>{row.hire_date ?? "—"}</td>
                <td>{row.tenure_days}</td>
                <td>{formatCurrency(row.salary)}</td>
                <td>{row.compa_ratio != null ? `${row.compa_ratio}%` : "—"}</td>
                <td>{row.range_penetration != null ? `${row.range_penetration}%` : "—"}</td>
                <td>
                  <span className={`pill ${row.below_minimum ? "pill-warning" : ""}`}>
                    {row.placement_issue.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GeoPayPolicyPanel({ report }: { report: GeoPayPolicyReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include <strong>Pay Zone</strong> and <strong>Geo Differential</strong> columns for location pay
        policy checks.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      {report.zone_medians.length > 0 ? (
        <>
          <h3>Zone medians</h3>
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Pay zone</th>
                  <th>Median differential</th>
                </tr>
              </thead>
              <tbody>
                {report.zone_medians.map((zone) => (
                  <tr key={zone.pay_zone}>
                    <td>{zone.pay_zone}</td>
                    <td>{zone.median_differential}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {report.flags.length === 0 ? (
        <div className="empty-state">All geo differentials align with pay-zone medians.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Zone</th>
                <th>Location</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {report.flags.map((row) => (
                <tr key={row.row_number}>
                  <td>{row.employee_id ?? "—"}</td>
                  <td>{row.pay_zone ?? "—"}</td>
                  <td>{row.location ?? "—"}</td>
                  <td>{row.expected_differential != null ? `${row.expected_differential}%` : "—"}</td>
                  <td>{row.actual_differential != null ? `${row.actual_differential}%` : "—"}</td>
                  <td>{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CurrencyReportPanel({ report }: { report: CurrencyReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include a <strong>Currency</strong> column for multi-currency workforce summaries.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      {report.multi_currency ? (
        <div className="alert alert-info">Multiple currencies detected in this file.</div>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Currency</th>
              <th>Headcount</th>
              <th>Median salary</th>
              <th>Median (USD est.)</th>
              <th>FX rate</th>
            </tr>
          </thead>
          <tbody>
            {report.currencies.map((row) => (
              <tr key={row.currency}>
                <td>{row.currency}</td>
                <td>{row.headcount}</td>
                <td>{formatCurrency(row.median_salary)}</td>
                <td>{formatCurrency(row.median_salary_usd)}</td>
                <td>{row.fx_rate_to_usd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeeTypePanel({ report }: { report: EmployeeTypeReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include an <strong>Employee Type</strong> column to summarize workforce mix and exclude
        interns/contractors from aggregates.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      {report.excluded_count > 0 ? (
        <div className="alert alert-info">
          {report.excluded_count} employees excluded from aggregate merit and peer-spread calculations.
        </div>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee type</th>
              <th>Headcount</th>
              <th>Aggregate stats</th>
            </tr>
          </thead>
          <tbody>
            {report.types.map((row) => (
              <tr key={row.employee_type}>
                <td>{row.employee_type}</td>
                <td>{row.headcount}</td>
                <td>{row.excluded_from_aggregates ? "Excluded" : "Included"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MidpointProgressionPanel({ report }: { report: MidpointProgressionReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include <strong>Job Level</strong> and range midpoints to validate level-to-level progression.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      {report.level_midpoints.length > 0 ? (
        <>
          <h3>Midpoints by level</h3>
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Midpoint</th>
                </tr>
              </thead>
              <tbody>
                {report.level_midpoints.map((row) => (
                  <tr key={row.job_level}>
                    <td>{row.job_level}</td>
                    <td>{formatCurrency(row.range_mid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {report.issues.length === 0 ? (
        <div className="empty-state">Midpoints progress logically across job levels.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lower level</th>
                <th>Higher level</th>
                <th>Lower mid</th>
                <th>Higher mid</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {report.issues.map((issue, index) => (
                <tr key={`${issue.lower_level}-${issue.higher_level}-${index}`}>
                  <td>{issue.lower_level}</td>
                  <td>{issue.higher_level}</td>
                  <td>{formatCurrency(issue.lower_midpoint)}</td>
                  <td>{formatCurrency(issue.higher_midpoint)}</td>
                  <td>{issue.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PerformanceMeritPanel({ report }: { report: PerformanceMeritReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Map a <strong>Performance Rating</strong> column to check merit vs performance alignment.
      </div>
    );
  }

  if (report.flags.length === 0) {
    return <div className="empty-state">No performance × merit misalignment flags detected.</div>;
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{report.disclaimer}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Rating</th>
              <th>Merit %</th>
              <th>File avg</th>
              <th>Flag</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {report.flags.map((row) => (
              <tr key={row.row_number}>
                <td><TrialName value={row.employee_name} fallback={row.employee_id ?? "—"} /></td>
                <td>{row.performance_rating}</td>
                <td>{row.merit_increase}%</td>
                <td>{row.file_average_merit}%</td>
                <td>
                  <span className="pill pill-warning">
                    {row.flag_type === "low_performer_high_merit"
                      ? "Low perf / high merit"
                      : "High perf / low merit"}
                  </span>
                </td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
