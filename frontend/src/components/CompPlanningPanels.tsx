import type {
  BonusTargetReview,
  MeritByDepartmentReport,
  PeerSpreadReport,
  PostMeritCompaReport,
} from "../types";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MeritByDepartmentTable({ report }: { report: MeritByDepartmentReport }) {
  if (!report.available || report.departments.length === 0) {
    return null;
  }

  return (
    <section className="equity-section insights-merit-by-dept">
      <div className="panel-header">
        <h3>Merit by department</h3>
        {report.file_average_merit != null ? (
          <span className="pill">File average {report.file_average_merit}%</span>
        ) : null}
      </div>
      <p className="file-meta">{report.disclaimer}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Headcount</th>
              <th>Avg merit %</th>
              <th>Projected pool</th>
              <th>Payroll base</th>
            </tr>
          </thead>
          <tbody>
            {report.departments
              .filter((dept) => dept.employees_with_merit > 0)
              .sort((a, b) => (b.average_merit_percent ?? 0) - (a.average_merit_percent ?? 0))
              .map((dept) => (
                <tr key={dept.department}>
                  <td>{dept.department}</td>
                  <td>{dept.headcount}</td>
                  <td>{dept.average_merit_percent != null ? `${dept.average_merit_percent}%` : "—"}</td>
                  <td>{formatCurrency(dept.projected_merit_pool)}</td>
                  <td>{formatCurrency(dept.payroll_base)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PostMeritCompaPanel({ report }: { report: PostMeritCompaReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include <strong>Merit Increase %</strong> and salary ranges to project compa-ratio after merit
        is applied.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <div className="alert alert-warning">{report.disclaimer}</div>
      <div className="card-grid card-grid--4" style={{ marginBottom: 16 }}>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Avg compa (current)</span>
          <strong className="stat-card__value">
            {report.average_current_compa != null ? `${report.average_current_compa}%` : "—"}
          </strong>
        </div>
        <div className="summary-card stat-card stat-card--info">
          <span className="stat-card__label">Avg compa (after merit)</span>
          <strong className="stat-card__value">
            {report.average_projected_compa != null ? `${report.average_projected_compa}%` : "—"}
          </strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Below 90% after merit</span>
          <strong className="stat-card__value">{report.employees_below_90_after}</strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Above 110% after merit</span>
          <strong className="stat-card__value">{report.employees_above_110_after}</strong>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Level</th>
              <th>Salary</th>
              <th>Merit %</th>
              <th>Current compa</th>
              <th>Projected compa</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {report.employees.map((row) => (
              <tr key={row.row_number}>
                <td>{row.employee_name ?? row.employee_id ?? "—"}</td>
                <td>{row.department ?? "—"}</td>
                <td>{row.job_level ?? "—"}</td>
                <td>{formatCurrency(row.salary)}</td>
                <td>{row.merit_increase}%</td>
                <td>{row.current_compa_ratio}%</td>
                <td>{row.projected_compa_ratio}%</td>
                <td>{row.compa_change >= 0 ? `+${row.compa_change}` : row.compa_change}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PeerSpreadPanel({ report }: { report: PeerSpreadReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include <strong>Job Level</strong> and <strong>Department</strong> to flag same-level peer
        groups with more than {report.spread_threshold ?? 15}% pay spread.
      </div>
    );
  }

  const uniqueGroups = new Map<string, (typeof report.flags)[number]>();
  for (const flag of report.flags) {
    const key = `${flag.job_level}-${flag.department}`;
    if (!uniqueGroups.has(key)) uniqueGroups.set(key, flag);
  }

  return (
    <div className="pay-equity-panel">
      <div className="alert alert-warning">{report.disclaimer}</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Department</th>
              <th>Headcount</th>
              <th>Pay range</th>
              <th>Spread</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(uniqueGroups.values()).map((flag) => (
              <tr key={`${flag.job_level}-${flag.department}`}>
                <td>{flag.job_level}</td>
                <td>{flag.department}</td>
                <td>{flag.headcount}</td>
                <td>
                  {formatCurrency(flag.group_min_salary)} – {formatCurrency(flag.group_max_salary)}
                </td>
                <td>{flag.spread_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BonusTargetOutliersPanel({ review }: { review: BonusTargetReview }) {
  if (!review.available) {
    return (
      <div className="empty-state">
        Map a <strong>Bonus Target</strong> column to review missing values and level-based outliers.
      </div>
    );
  }

  if (review.outliers.length === 0) {
    return (
      <div className="empty-state">
        No bonus target outliers detected at the same job level (groups need at least four employees).
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <p className="file-meta">{review.disclaimer}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Row</th>
              <th>Employee</th>
              <th>Level</th>
              <th>Department</th>
              <th>Bonus target</th>
              <th>Level median</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {review.outliers.map((row) => (
              <tr key={row.row_number}>
                <td>{row.row_number}</td>
                <td>{row.employee_name ?? row.employee_id ?? "—"}</td>
                <td>{row.job_level ?? "—"}</td>
                <td>{row.department ?? "—"}</td>
                <td>{row.bonus_target}%</td>
                <td>{row.level_median_bonus != null ? `${row.level_median_bonus}%` : "—"}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
