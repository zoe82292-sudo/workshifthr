import type {
  AnalysisResult,
  DemographicGroupStats,
  PayEquityGap,
  PayEquityReport,
} from "../types";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function GroupStatsTable({ groups, title }: { groups: DemographicGroupStats[]; title: string }) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="equity-section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Headcount</th>
              <th>% of Workforce</th>
              <th>Median Salary</th>
              <th>Mean Salary</th>
              <th>Median Compa-Ratio</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={`${group.dimension}-${group.group_name}`}>
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
                <td>
                  {group.suppressed || group.median_compa_ratio == null
                    ? "—"
                    : `${group.median_compa_ratio}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GapTable({ gaps, title }: { gaps: PayEquityGap[]; title: string }) {
  if (gaps.length === 0) {
    return (
      <div className="equity-section">
        <h3>{title}</h3>
        <p className="file-meta">No reportable median pay gaps for groups with at least five employees.</p>
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
              <th>Higher-Paid Group</th>
              <th>Lower-Paid Group</th>
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

export function PayEquityPanel({
  payEquity,
  departmentFilter = "",
}: {
  payEquity: PayEquityReport;
  departmentFilter?: string;
}) {
  if (!payEquity.available) {
    return (
      <div className="empty-state">
        Include <strong>Gender</strong> and/or <strong>Race/Ethnicity</strong> columns in your
        upload to run pay equity analysis.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel">
      <div className="alert alert-warning">{payEquity.disclaimer}</div>

      {departmentFilter ? (
        <div className="alert alert-info">
          Pay equity summaries are organization-wide. Clear the department filter to review
          company-level medians, or export a single-department file for a focused slice.
        </div>
      ) : null}

      {payEquity.level_breakdowns.length > 0 ? (
        <div className="equity-section">
          <h3>By job level (recommended — same-level comparisons)</h3>
          <p className="file-meta" style={{ marginBottom: 16 }}>
            Start here for the most meaningful read. Comparing pay within the same job level
            accounts for grade differences but not tenure, location, or performance.
          </p>
          {payEquity.level_breakdowns.map((level) => (
            <div className="panel equity-level-card" key={level.job_level}>
              <h4>
                Level {level.job_level} · {level.headcount} employees
              </h4>
              <GroupStatsTable groups={level.gender_groups} title="Gender at this level" />
              <GapTable gaps={level.gender_gaps} title="Gender gaps at this level" />
              <GroupStatsTable groups={level.race_groups} title="Race/ethnicity at this level" />
              <GapTable gaps={level.race_gaps} title="Race/ethnicity gaps at this level" />
            </div>
          ))}
        </div>
      ) : null}

      <GroupStatsTable groups={payEquity.gender_groups} title="Pay by gender (all levels)" />
      <GapTable gaps={payEquity.gender_gaps} title="Gender median pay gaps (all levels)" />

      <GroupStatsTable groups={payEquity.race_groups} title="Pay by race/ethnicity (all levels)" />
      <GapTable gaps={payEquity.race_gaps} title="Race/ethnicity median pay gaps (all levels)" />

      {payEquity.employees_missing_gender > 0 ? (
        <p className="file-meta">
          {payEquity.employees_missing_gender} employees missing gender data.
        </p>
      ) : null}
      {payEquity.employees_missing_race > 0 ? (
        <p className="file-meta">
          {payEquity.employees_missing_race} employees missing race/ethnicity data.
        </p>
      ) : null}
    </div>
  );
}

export function payEquityTabCount(result: AnalysisResult): number {
  if (!result.pay_equity.available) {
    return 0;
  }
  return (
    result.pay_equity.gender_gaps.length +
    result.pay_equity.race_gaps.length +
    (result.pay_equity.gender_groups.length > 0 ? 1 : 0) +
    (result.pay_equity.race_groups.length > 0 ? 1 : 0)
  );
}
