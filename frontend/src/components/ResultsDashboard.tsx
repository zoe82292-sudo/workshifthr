import type { AnalysisResult, AnalysisTab } from "../types";
import { PENETRATION_BAND_LABELS } from "../types";
import { useSortableRows } from "../useSortableRows";
import { exportAnalysisExcel, exportAnalysisPdf, exportExecutiveSummaryPdf } from "../exportActions";
import { saveAnalysisHistory } from "../api";
import { ColumnMappingSummary } from "./ColumnMappingSummary";
import { InsightsPanel } from "./InsightsPanel";
import { PayEquityPanel, payEquityTabCount } from "./PayEquityPanel";
import { useMemo, useState, type ReactNode } from "react";
import { TablePagination, useTablePagination } from "./TablePagination";

interface ResultsDashboardProps {
  result: AnalysisResult;
  activeTab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
  fileName?: string | null;
  authRequired?: boolean;
  onHistorySaved?: () => void;
}

function PaginatedSlice<T>({
  items,
  children,
}: {
  items: T[];
  children: (pageItems: T[]) => ReactNode;
}) {
  const pagination = useTablePagination(items);

  return (
    <div className="paginated-slice">
      {children(pagination.pageItems)}
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        showingFrom={pagination.showingFrom}
        showingTo={pagination.showingTo}
        onPageChange={pagination.setPage}
      />
    </div>
  );
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

const TAB_GROUPS: Array<{ title: string; ids: AnalysisTab[] }> = [
  {
    title: "Flagged issues",
    ids: [
      "below_minimum",
      "above_maximum",
      "duplicate_ids",
      "compression",
      "managers_below_reports",
    ],
  },
  {
    title: "Ranges & compa",
    ids: ["range_penetration", "compa_ratio"],
  },
  {
    title: "Pay equity",
    ids: ["pay_equity"],
  },
  {
    title: "Data quality",
    ids: [
      "missing_bonus_targets",
      "missing_salary_ranges",
      "invalid_effective_dates",
      "outlier_merit_increases",
      "missing_data",
    ],
  },
];

const TABS_BY_ID = Object.fromEntries(TABS.map((tab) => [tab.id, tab])) as Record<
  AnalysisTab,
  (typeof TABS)[number]
>;

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
  showGapToMinimum = false,
  departmentFilter = "",
  search = "",
}: {
  rows: AnalysisResult["below_minimum"];
  showPenetration?: boolean;
  showGapToMinimum?: boolean;
  departmentFilter?: string;
  search?: string;
}) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (departmentFilter && (row.department ?? "") !== departmentFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        row.employee_id,
        row.employee_name,
        row.department,
        row.job_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, departmentFilter, search]);

  const { sortedRows, toggleSort, sortLabel } = useSortableRows(filtered, "row_number");
  const pagination = useTablePagination(sortedRows);

  if (rows.length === 0) {
    return <div className="empty-state">No issues found in this category.</div>;
  }

  if (filtered.length === 0) {
    return <div className="empty-state">No rows match your filters.</div>;
  }

  return (
    <div className="paginated-slice">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("row_number")}>
                  {sortLabel("row_number", "Row")}
                </button>
              </th>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("employee_id")}>
                  {sortLabel("employee_id", "Employee ID")}
                </button>
              </th>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("employee_name")}>
                  {sortLabel("employee_name", "Name")}
                </button>
              </th>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("department")}>
                  {sortLabel("department", "Department")}
                </button>
              </th>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("job_level")}>
                  {sortLabel("job_level", "Level")}
                </button>
              </th>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("salary")}>
                  {sortLabel("salary", "Salary")}
                </button>
              </th>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("range_min")}>
                  {sortLabel("range_min", "Range Min")}
                </button>
              </th>
              <th>
                <button type="button" className="sortable-header" onClick={() => toggleSort("range_max")}>
                  {sortLabel("range_max", "Range Max")}
                </button>
              </th>
              {showGapToMinimum ? (
                <th>
                  <button
                    type="button"
                    className="sortable-header"
                    onClick={() => toggleSort("gap_to_minimum")}
                  >
                    {sortLabel("gap_to_minimum", "Gap to Min")}
                  </button>
                </th>
              ) : null}
              {showPenetration ? (
                <th>
                  <button
                    type="button"
                    className="sortable-header"
                    onClick={() => toggleSort("range_penetration")}
                  >
                    {sortLabel("range_penetration", "Penetration")}
                  </button>
                </th>
              ) : null}
              {showPenetration ? <th>Band</th> : null}
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((row) => (
            <tr key={`${row.row_number}-${row.employee_id}`}>
              <td>{row.row_number}</td>
              <td>{row.employee_id ?? "—"}</td>
              <td>{row.employee_name ?? "—"}</td>
              <td>{row.department ?? "—"}</td>
              <td>{row.job_level ?? "—"}</td>
              <td>{formatCurrency(row.salary)}</td>
              <td>{formatCurrency(row.range_min)}</td>
              <td>{formatCurrency(row.range_max)}</td>
              {showGapToMinimum ? <td>{formatCurrency(row.gap_to_minimum)}</td> : null}
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
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        showingFrom={pagination.showingFrom}
        showingTo={pagination.showingTo}
        onPageChange={pagination.setPage}
      />
    </div>
  );
}

export function ResultsDashboard({
  result,
  activeTab,
  onTabChange,
  fileName,
  authRequired = false,
  onHistorySaved,
}: ResultsDashboardProps) {
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const filteredCompression = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return result.compression;
    return result.compression.filter((issue) =>
      [issue.issue_type, issue.description, issue.employee_name, issue.employee_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [result.compression, search]);

  const filteredManagers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return result.managers_below_reports;
    return result.managers_below_reports.filter((issue) =>
      [
        issue.manager_id,
        issue.manager_name,
        issue.report_id,
        issue.report_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [result.managers_below_reports, search]);

  const departments = useMemo(() => {
    const values = new Set<string>();
    for (const row of result.range_penetration) {
      if (row.department) values.add(row.department);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [result.range_penetration]);

  async function handleSaveHistory() {
    if (!fileName) return;
    setSavingHistory(true);
    setHistoryMessage(null);
    try {
      await saveAnalysisHistory(fileName, result);
      setHistoryMessage("Analysis saved to your account history.");
      onHistorySaved?.();
    } catch (caught) {
      setHistoryMessage(
        caught instanceof Error ? caught.message : "Unable to save analysis history.",
      );
    } finally {
      setSavingHistory(false);
    }
  }

  return (
    <>
      <div className="panel-header" style={{ marginBottom: 16 }}>
        <h2>Analysis results</h2>
        <div className="download-actions">
          {authRequired && fileName ? (
            <button
              className="button button-secondary"
              type="button"
              disabled={savingHistory}
              onClick={() => void handleSaveHistory()}
            >
              {savingHistory ? "Saving…" : "Save to history"}
            </button>
          ) : null}
          <button
            className="button button-primary"
            type="button"
            disabled={exporting === "excel"}
            onClick={() => {
              setExporting("excel");
              void exportAnalysisExcel(result).finally(() => setExporting(null));
            }}
          >
            {exporting === "excel" ? "Preparing…" : "Download Excel"}
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={exporting === "pdf"}
            onClick={() => {
              setExporting("pdf");
              void exportAnalysisPdf(result).finally(() => setExporting(null));
            }}
          >
            {exporting === "pdf" ? "Preparing…" : "Download PDF"}
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={exporting === "exec-pdf"}
            onClick={() => {
              setExporting("exec-pdf");
              void exportExecutiveSummaryPdf(result).finally(() => setExporting(null));
            }}
          >
            {exporting === "exec-pdf" ? "Preparing…" : "Executive PDF"}
          </button>
        </div>
      </div>

      {historyMessage ? <div className="alert alert-info">{historyMessage}</div> : null}

      <ColumnMappingSummary
        mapping={result.column_mapping}
        detectedColumns={result.detected_columns}
      />

      <InsightsPanel result={result} />
      <div className="summary-grid card-grid card-grid--4" aria-label="Issue counts">
        <div className="summary-card stat-card">
          <span className="stat-card__label">Total rows</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">{result.summary.total_rows}</strong>
        </div>
        <div className="summary-card stat-card stat-card--danger">
          <span className="stat-card__label">Below minimum</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">{result.summary.below_minimum}</strong>
        </div>
        <div className="summary-card stat-card stat-card--warning">
          <span className="stat-card__label">Above maximum</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">{result.summary.above_maximum}</strong>
        </div>
        <div className="summary-card stat-card stat-card--info">
          <span className="stat-card__label">Managers below reports</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">{result.summary.managers_below_reports}</strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Missing salary ranges</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">{result.summary.missing_salary_ranges}</strong>
        </div>
        <div className="summary-card stat-card stat-card--info">
          <span className="stat-card__label">Pay equity gaps</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">{result.summary.pay_equity_gaps}</strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Outlier merit increases</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">{result.summary.outlier_merit_increases}</strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Avg penetration</span>
          <div className="stat-card__grow" aria-hidden="true" />
          <strong className="stat-card__value">
            {result.summary.average_penetration != null
              ? `${result.summary.average_penetration}%`
              : "—"}
          </strong>
        </div>
      </div>

      <div className="tab-groups" role="tablist" aria-label="Issue categories">
        {TAB_GROUPS.map((group) => (
          <div className="tab-group" key={group.title}>
            <span className="tab-group__label">{group.title}</span>
            <div className="tab-group__tabs">
              {group.ids.map((tabId) => {
                const tab = TABS_BY_ID[tabId];
                return (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tabId}
                    className={`tab ${activeTab === tabId ? "active" : ""}`}
                    onClick={() => onTabChange(tabId)}
                  >
                    {tab.label} ({tab.count(result)})
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {result.range_penetration.length > 0 ? (
        <div className="table-filters">
          <label className="table-filters__field">
            <span>Department</span>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
          <label className="table-filters__field table-filters__field--grow">
            <span>Search</span>
            <input
              type="search"
              placeholder="Employee, ID, department, level…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {activeTab === "below_minimum" ? (
        <EmployeeTable
          rows={result.below_minimum}
          showGapToMinimum
          departmentFilter={departmentFilter}
          search={search}
        />
      ) : null}
      {activeTab === "above_maximum" ? (
        <EmployeeTable rows={result.above_maximum} departmentFilter={departmentFilter} search={search} />
      ) : null}

      {activeTab === "duplicate_ids" ? (
        result.duplicate_ids.length === 0 ? (
          <div className="empty-state">No duplicate employee IDs found.</div>
        ) : (
          <PaginatedSlice items={result.duplicate_ids}>
            {(pageItems) => (
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
                    {pageItems.map((group) => (
                      <tr key={group.employee_id}>
                        <td>{group.employee_id}</td>
                        <td>{group.count}</td>
                        <td>{group.rows.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PaginatedSlice>
        )
      ) : null}

      {activeTab === "range_penetration" ? (
        <>
          <p className="file-meta" style={{ marginBottom: 16 }}>
            Range penetration = (salary − range min) ÷ (range max − range min) × 100
          </p>
          <EmployeeTable
            rows={result.range_penetration}
            showPenetration
            departmentFilter={departmentFilter}
            search={search}
          />
        </>
      ) : null}

      {activeTab === "compression" ? (
        result.compression.length === 0 ? (
          <div className="empty-state">No salary compression patterns detected.</div>
        ) : (
          <>
            {result.compression.length >= 100 && result.summary.compression_issues >= 100 ? (
              <p className="file-meta" style={{ marginBottom: 12 }}>
                Showing the first 100 compression issues. Download Excel for the full export if your
                file triggered additional patterns.
              </p>
            ) : null}
            <PaginatedSlice items={filteredCompression}>
            {(pageItems) => (
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
                    {pageItems.map((issue, index) => (
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
            )}
            </PaginatedSlice>
          </>
        )
      ) : null}

      {activeTab === "managers_below_reports" ? (
        result.managers_below_reports.length === 0 ? (
          <div className="empty-state">No managers paid below direct reports.</div>
        ) : (
          <PaginatedSlice items={filteredManagers}>
            {(pageItems) => (
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
                    {pageItems.map((issue) => (
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
            )}
          </PaginatedSlice>
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
          <PaginatedSlice items={result.compa_ratios}>
            {(pageItems) => (
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
                    {pageItems.map((row) => (
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
            )}
          </PaginatedSlice>
        )
      ) : null}

      {activeTab === "pay_equity" ? <PayEquityPanel payEquity={result.pay_equity} /> : null}

      {activeTab === "missing_data" ? (
        result.missing_data.length === 0 ? (
          <div className="empty-state">All required compensation fields are present.</div>
        ) : (
          <PaginatedSlice items={result.missing_data}>
            {(pageItems) => (
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
                    {pageItems.map((row) => (
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
            )}
          </PaginatedSlice>
        )
      ) : null}
    </>
  );
}
