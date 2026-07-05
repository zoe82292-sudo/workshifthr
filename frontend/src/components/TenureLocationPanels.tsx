import type { LocationPayReport, TenureReport } from "../types";

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
  return `${value}%`;
}

function GroupStatsTable({
  groups,
  title,
}: {
  groups: LocationPayReport["location_groups"];
  title: string;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="equity-section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Headcount</th>
              <th>% of Workforce</th>
              <th>Median Salary</th>
              <th>Mean Salary</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.group_name}>
                <td>{group.group_name}</td>
                <td>{group.headcount}</td>
                <td>{group.workforce_percent}%</td>
                <td>
                  {group.suppressed ? (
                    <span className="pill pill-warning">Hidden (&lt; 5 employees)</span>
                  ) : (
                    formatCurrency(group.median_salary)
                  )}
                </td>
                <td>{group.suppressed ? "—" : formatCurrency(group.mean_salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GapTable({
  gaps,
  title,
}: {
  gaps: LocationPayReport["location_gaps"];
  title: string;
}) {
  if (gaps.length === 0) {
    return (
      <div className="equity-section">
        <h3>{title}</h3>
        <p className="file-meta">No reportable median pay gaps between locations with at least five employees.</p>
      </div>
    );
  }

  return (
    <div className="equity-section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Scope</th>
              <th>Higher-Paid Location</th>
              <th>Lower-Paid Location</th>
              <th>Higher Median</th>
              <th>Lower Median</th>
              <th>Gap</th>
              <th>Gap %</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((gap, index) => (
              <tr key={`${gap.scope}-${gap.higher_paid_group}-${gap.lower_paid_group}-${index}`}>
                <td>{gap.scope}</td>
                <td>{gap.higher_paid_group}</td>
                <td>{gap.lower_paid_group}</td>
                <td>{formatCurrency(gap.higher_median)}</td>
                <td>{formatCurrency(gap.lower_median)}</td>
                <td>{formatCurrency(gap.gap_amount)}</td>
                <td>{gap.gap_percent != null ? `${gap.gap_percent}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LocationPayPanel({ report }: { report: LocationPayReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include a <strong>Location</strong>, <strong>City</strong>, or <strong>Office</strong> column in
        your upload to compare median pay across locations.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <div className="alert alert-warning">{report.disclaimer}</div>
      <GroupStatsTable groups={report.location_groups} title="Median pay by location" />
      <GapTable gaps={report.location_gaps} title="Location median pay gaps" />

      {report.level_breakdowns.length > 0 ? (
        <div className="equity-section">
          <h3>By job level (same-level location comparisons)</h3>
          {report.level_breakdowns.map((level) => (
            <div className="panel equity-level-card" key={level.job_level}>
              <h4>
                Level {level.job_level} · {level.headcount} employees
              </h4>
              <GroupStatsTable groups={level.location_groups} title="Locations at this level" />
              <GapTable gaps={level.location_gaps} title="Location gaps at this level" />
            </div>
          ))}
        </div>
      ) : null}

      {report.employees_missing_location > 0 ? (
        <p className="file-meta">{report.employees_missing_location} employees missing location data.</p>
      ) : null}
    </div>
  );
}

export function TenurePanel({ report }: { report: TenureReport }) {
  if (!report.available) {
    return (
      <div className="empty-state">
        Include a <strong>Hire Date</strong> or <strong>Start Date</strong> column to review tenure bands
        and pay vs. tenure flags.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <div className="alert alert-warning">{report.disclaimer}</div>

      {report.bands.length > 0 ? (
        <div className="equity-section">
          <h3>Pay by tenure band</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tenure band</th>
                  <th>Headcount</th>
                  <th>Median salary</th>
                  <th>Median tenure (years)</th>
                  <th>Median compa-ratio</th>
                </tr>
              </thead>
              <tbody>
                {report.bands.map((band) => (
                  <tr key={band.band_label}>
                    <td>{band.band_label}</td>
                    <td>{band.headcount}</td>
                    <td>{formatCurrency(band.median_salary)}</td>
                    <td>{band.median_tenure_years ?? "—"}</td>
                    <td>{formatPercent(band.median_compa_ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {report.flags.length > 0 ? (
        <div className="equity-section">
          <h3>Tenure pay flags ({report.flags.length})</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee</th>
                  <th>Hire date</th>
                  <th>Tenure (years)</th>
                  <th>Salary</th>
                  <th>Flag</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.flags.map((flag) => (
                  <tr key={`${flag.row_number}-${flag.flag_type}`}>
                    <td>{flag.row_number}</td>
                    <td>{flag.employee_name ?? flag.employee_id ?? "—"}</td>
                    <td>{flag.hire_date ?? "—"}</td>
                    <td>{flag.tenure_years}</td>
                    <td>{formatCurrency(flag.salary)}</td>
                    <td>
                      <span className="pill pill-warning">
                        {flag.flag_type === "short_tenure_high_pay"
                          ? "Short tenure, high pay"
                          : "Long tenure, low pay"}
                      </span>
                    </td>
                    <td>{flag.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="file-meta">No tenure pay flags detected for this file.</p>
      )}

      {report.employees.length > 0 ? (
        <div className="equity-section">
          <h3>Employee tenure detail</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Location</th>
                  <th>Department</th>
                  <th>Level</th>
                  <th>Hire date</th>
                  <th>Tenure</th>
                  <th>Band</th>
                  <th>Salary</th>
                  <th>Compa-ratio</th>
                </tr>
              </thead>
              <tbody>
                {report.employees.slice(0, 100).map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.employee_name ?? row.employee_id ?? "—"}</td>
                    <td>{row.location ?? "—"}</td>
                    <td>{row.department ?? "—"}</td>
                    <td>{row.job_level ?? "—"}</td>
                    <td>{row.hire_date ?? "—"}</td>
                    <td>{row.tenure_years} yrs</td>
                    <td>{row.tenure_band}</td>
                    <td>{formatCurrency(row.salary)}</td>
                    <td>{formatPercent(row.compa_ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.employees.length > 100 ? (
            <p className="file-meta">Showing first 100 employees. Export for the full list.</p>
          ) : null}
        </div>
      ) : null}

      {report.employees_missing_hire_date > 0 ? (
        <p className="file-meta">{report.employees_missing_hire_date} rows missing hire date.</p>
      ) : null}
    </div>
  );
}

export function tenureTabCount(result: { tenure: TenureReport; summary: { tenure_pay_flags?: number } }): number {
  if (!result.tenure.available) return 0;
  return (result.summary.tenure_pay_flags ?? result.tenure.flags.length) + (result.tenure.bands.length > 0 ? 1 : 0);
}

export function locationTabCount(result: {
  location_pay: LocationPayReport;
  summary: { location_pay_gaps?: number };
}): number {
  if (!result.location_pay.available) return 0;
  return (
    (result.summary.location_pay_gaps ?? result.location_pay.location_gaps.length) +
    (result.location_pay.location_groups.length > 0 ? 1 : 0)
  );
}
