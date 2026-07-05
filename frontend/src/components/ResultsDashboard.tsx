import type { AnalysisResult, AnalysisTab } from "../types";
import { PENETRATION_BAND_LABELS } from "../types";
import { useSortableRows } from "../useSortableRows";
import { exportReportExcel, exportSummaryPdf } from "../exportActions";
import { saveAnalysisHistory } from "../api";
import {
  buildDepartmentLookup,
  collectDepartments,
  employeeInDepartment,
  textMatchesSearch,
} from "../analysisFilters";
import {
  BonusTargetOutliersPanel,
  MeritByDepartmentTable,
  PeerSpreadPanel,
  PostMeritCompaPanel,
} from "./CompPlanningPanels";
import { ColumnMappingSummary } from "./ColumnMappingSummary";
import { InsightsPanel } from "./InsightsPanel";
import { PayEquityPanel, payEquityTabCount } from "./PayEquityPanel";
import {
  LocationPayPanel,
  TenurePanel,
  locationTabCount,
  tenureTabCount,
} from "./TenureLocationPanels";
import { useMemo, useState, useCallback, type ReactNode } from "react";
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
      id: "peer_spread",
      label: "Peer Pay Spread",
      count: (r) => r.summary.peer_spread_flags ?? r.peer_spread?.flags?.length ?? 0,
    },
    {
      id: "pay_equity",
      label: "Pay Equity",
      count: (r) => payEquityTabCount(r),
    },
    {
      id: "tenure",
      label: "Tenure",
      count: (r) => tenureTabCount(r),
    },
    {
      id: "location_pay",
      label: "Location Pay",
      count: (r) => locationTabCount(r),
    },
    {
      id: "managers_below_reports",
      label: "Managers Below Reports",
      count: (r) => r.summary.managers_below_reports,
    },
    {
      id: "missing_bonus_targets",
      label: "Bonus Targets",
      count: (r) =>
        r.summary.missing_bonus_targets +
        (r.summary.bonus_target_outliers ?? r.bonus_target_review?.outliers?.length ?? 0),
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
    {
      id: "new_hire_merit_flags",
      label: "New-Hire Merit",
      count: (r) => r.summary.new_hire_merit_flags ?? r.new_hire_merit_flags.length,
    },
    {
      id: "merit_compa_flags",
      label: "Merit vs Compa",
      count: (r) => r.summary.merit_compa_flags ?? r.merit_compa_flags?.length ?? 0,
    },
    {
      id: "equity_grants",
      label: "Equity Grants",
      count: (r) => (r.column_mapping.equity_grant ? (r.equity_grants ?? []).length : 0),
    },
    {
      id: "unusual_comp_changes",
      label: "Unusual Promotions",
      count: (r) =>
        (r.unusual_comp_changes ?? []).filter((row) => row.change_type === "promotion").length,
    },
    { id: "compa_ratio", label: "Compa-Ratio", count: (r) => r.compa_ratios.length },
    {
      id: "post_merit_compa",
      label: "Post-Merit Compa",
      count: (r) => r.summary.post_merit_compa_rows ?? r.post_merit_compa?.employees?.length ?? 0,
    },
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
      "peer_spread",
      "managers_below_reports",
    ],
  },
  {
    title: "Ranges & compa",
    ids: ["range_penetration", "compa_ratio", "post_merit_compa"],
  },
  {
    title: "Pay equity",
    ids: ["pay_equity"],
  },
  {
    title: "Workforce insights",
    ids: ["tenure", "location_pay"],
  },
  {
    title: "Merit & LTI",
    ids: [
      "outlier_merit_increases",
      "new_hire_merit_flags",
      "merit_compa_flags",
      "equity_grants",
      "unusual_comp_changes",
    ],
  },
  {
    title: "Data quality",
    ids: [
      "missing_bonus_targets",
      "missing_salary_ranges",
      "invalid_effective_dates",
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
  onDepartmentSelect,
}: {
  rows: AnalysisResult["below_minimum"];
  showPenetration?: boolean;
  showGapToMinimum?: boolean;
  departmentFilter?: string;
  search?: string;
  onDepartmentSelect?: (department: string) => void;
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
              <td>
                {row.department ? (
                  <button
                    type="button"
                    className={`department-link${
                      departmentFilter === row.department ? " department-link--active" : ""
                    }`}
                    onClick={() => onDepartmentSelect?.(row.department!)}
                    title={`Filter to ${row.department}`}
                  >
                    {row.department}
                  </button>
                ) : (
                  "—"
                )}
              </td>
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

function tabIsVisible(tabId: AnalysisTab, result: AnalysisResult): boolean {
  if (tabId === "equity_grants") {
    return Boolean(result.column_mapping.equity_grant);
  }
  return true;
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
  const [targetMeritPercent, setTargetMeritPercent] = useState<number | null>(null);
  const [anonymizeExports, setAnonymizeExports] = useState(false);

  const departmentLookup = useMemo(() => buildDepartmentLookup(result), [result]);

  const exportOptions = useMemo(
    () => ({ targetMeritPercent, anonymize: anonymizeExports }),
    [targetMeritPercent, anonymizeExports],
  );

  const filteredCompression = useMemo(() => {
    const query = search.trim().toLowerCase();
    return result.compression.filter((issue) => {
      if (departmentFilter && issue.employee_id) {
        if (!employeeInDepartment(issue.employee_id, departmentFilter, departmentLookup)) {
          return false;
        }
      }
      if (!query) return true;
      return textMatchesSearch(
        [issue.issue_type, issue.description, issue.employee_name, issue.employee_id],
        query,
      );
    });
  }, [departmentFilter, departmentLookup, result.compression, search]);

  const filteredManagers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return result.managers_below_reports.filter((issue) => {
      if (departmentFilter) {
        const managerDept = employeeInDepartment(issue.manager_id, departmentFilter, departmentLookup);
        const reportDept = employeeInDepartment(issue.report_id, departmentFilter, departmentLookup);
        if (!managerDept && !reportDept) return false;
      }
      if (!query) return true;
      return textMatchesSearch(
        [issue.manager_id, issue.manager_name, issue.report_id, issue.report_name],
        query,
      );
    });
  }, [departmentFilter, departmentLookup, result.managers_below_reports, search]);

  const filteredCompaRatios = useMemo(() => {
    const query = search.trim().toLowerCase();
    return result.compa_ratios.filter((row) => {
      if (
        departmentFilter &&
        !employeeInDepartment(row.employee_id, departmentFilter, departmentLookup)
      ) {
        return false;
      }
      if (!query) return true;
      return textMatchesSearch([row.employee_id, row.employee_name], query);
    });
  }, [departmentFilter, departmentLookup, result.compa_ratios, search]);

  const filteredDuplicateIds = useMemo(() => {
    if (!departmentFilter) return result.duplicate_ids;
    return result.duplicate_ids.filter((group) =>
      employeeInDepartment(group.employee_id, departmentFilter, departmentLookup),
    );
  }, [departmentFilter, departmentLookup, result.duplicate_ids]);

  const filterIssueRows = useCallback(
    <T extends { employee_id?: string | null; employee_name?: string | null }>(rows: T[]): T[] => {
      const query = search.trim().toLowerCase();
      return rows.filter((row) => {
        if (
          departmentFilter &&
          !employeeInDepartment(row.employee_id, departmentFilter, departmentLookup)
        ) {
          return false;
        }
        if (!query) return true;
        return textMatchesSearch([row.employee_id, row.employee_name], query);
      });
    },
    [departmentFilter, departmentLookup, search],
  );

  const filteredEquityGrants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (result.equity_grants ?? []).filter((row) => {
      if (departmentFilter && (row.department ?? "") !== departmentFilter) {
        return false;
      }
      if (!query) return true;
      return textMatchesSearch([row.employee_id, row.employee_name, row.department], query);
    });
  }, [departmentFilter, result.equity_grants, search]);

  const filteredMeritCompaFlags = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (result.merit_compa_flags ?? []).filter((row) => {
      if (departmentFilter && (row.department ?? "") !== departmentFilter) {
        if (!employeeInDepartment(row.employee_id, departmentFilter, departmentLookup)) {
          return false;
        }
      }
      if (!query) return true;
      return textMatchesSearch(
        [row.employee_id, row.employee_name, row.department, row.flag_type],
        query,
      );
    });
  }, [departmentFilter, departmentLookup, result.merit_compa_flags, search]);

  const equityGrantOutliers = useMemo(
    () => (result.equity_grants ?? []).filter((row) => row.is_outlier).length,
    [result.equity_grants],
  );

  const filteredPromotionChanges = useMemo(() => {
    return filterIssueRows(
      (result.unusual_comp_changes ?? []).filter((row) => row.change_type === "promotion"),
    );
  }, [filterIssueRows, result.unusual_comp_changes]);

  const departments = useMemo(() => collectDepartments(result), [result]);

  function toggleDepartmentFilter(department: string) {
    setDepartmentFilter((current) => (current === department ? "" : department));
  }

  async function handleSaveHistory() {
    if (!fileName) return;
    setSavingHistory(true);
    setHistoryMessage(null);
    try {
      await saveAnalysisHistory(fileName, result);
      setHistoryMessage("Analysis saved to your organization history.");
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
        <div className="export-actions">
          <label className="legal-consent-checkbox export-anonymize-toggle">
            <input
              type="checkbox"
              checked={anonymizeExports}
              onChange={(event) => setAnonymizeExports(event.target.checked)}
            />
            <span>Anonymize names in exports</span>
          </label>
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
          <div className="export-action-group">
            <span className="export-action-label">For leadership</span>
            <button
              className="button button-secondary"
              type="button"
              disabled={exporting === "summary-pdf"}
              onClick={() => {
                setExporting("summary-pdf");
                void exportSummaryPdf(result, undefined, exportOptions).finally(() =>
                  setExporting(null),
                );
              }}
            >
              {exporting === "summary-pdf" ? "Preparing…" : "PDF summary"}
            </button>
          </div>
          <div className="export-action-group">
            <span className="export-action-label">Full analysis</span>
            <button
              className="button button-primary"
              type="button"
              disabled={exporting === "report-excel"}
              onClick={() => {
                setExporting("report-excel");
                void exportReportExcel(result, undefined, exportOptions).finally(() =>
                  setExporting(null),
                );
              }}
            >
              {exporting === "report-excel" ? "Preparing…" : "Excel report"}
            </button>
          </div>
        </div>
      </div>

      {historyMessage ? <div className="alert alert-info">{historyMessage}</div> : null}

      <ColumnMappingSummary
        mapping={result.column_mapping}
        detectedColumns={result.detected_columns}
      />

      <InsightsPanel
        result={result}
        onTargetMeritChange={setTargetMeritPercent}
      />
      <MeritByDepartmentTable report={result.merit_by_department} />
      <div className="summary-grid card-grid card-grid--4" aria-label="Issue counts">
        <div className="summary-card stat-card">
          <span className="stat-card__label">Total rows</span>
          <strong className="stat-card__value">{result.summary.total_rows}</strong>
        </div>
        <div className="summary-card stat-card stat-card--danger">
          <span className="stat-card__label">Below minimum</span>
          <strong className="stat-card__value">{result.summary.below_minimum}</strong>
        </div>
        <div className="summary-card stat-card stat-card--warning">
          <span className="stat-card__label">Above maximum</span>
          <strong className="stat-card__value">{result.summary.above_maximum}</strong>
        </div>
        <div className="summary-card stat-card stat-card--info">
          <span className="stat-card__label">Managers below reports</span>
          <strong className="stat-card__value">{result.summary.managers_below_reports}</strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Missing salary ranges</span>
          <strong className="stat-card__value">{result.summary.missing_salary_ranges}</strong>
        </div>
        <div className="summary-card stat-card stat-card--info">
          <span className="stat-card__label">Pay equity gaps</span>
          <strong className="stat-card__value">{result.summary.pay_equity_gaps}</strong>
        </div>
        {result.tenure.available ? (
          <div className="summary-card stat-card stat-card--warning">
            <span className="stat-card__label">Tenure pay flags</span>
            <strong className="stat-card__value">{result.summary.tenure_pay_flags ?? 0}</strong>
          </div>
        ) : null}
        {result.location_pay.available ? (
          <div className="summary-card stat-card stat-card--info">
            <span className="stat-card__label">Location pay gaps</span>
            <strong className="stat-card__value">{result.summary.location_pay_gaps ?? 0}</strong>
          </div>
        ) : null}
        <div className="summary-card stat-card">
          <span className="stat-card__label">Outlier merit increases</span>
          <strong className="stat-card__value">{result.summary.outlier_merit_increases}</strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Avg penetration</span>
          <strong className="stat-card__value">
            {result.summary.average_penetration != null
              ? `${result.summary.average_penetration}%`
              : "—"}
          </strong>
        </div>
      </div>

      {departments.length > 0 ? (
        <div className="table-filters">
          <label className="table-filters__field" htmlFor="results-department-filter">
            <span>Department</span>
            <select
              id="results-department-filter"
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
          <label className="table-filters__field table-filters__field--grow" htmlFor="results-search">
            <span>Search</span>
            <input
              id="results-search"
              type="search"
              placeholder="Employee, ID, department, level…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {departmentFilter ? (
            <div className="table-filters__active">
              <span>
                Showing <strong>{departmentFilter}</strong> only
              </span>
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => setDepartmentFilter("")}
              >
                Clear filter
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="tab-groups" role="tablist" aria-label="Issue categories">
        {TAB_GROUPS.map((group) => (
          <div className="tab-group" key={group.title}>
            <span className="tab-group__label">{group.title}</span>
            <div className="tab-group__tabs">
              {group.ids.filter((tabId) => tabIsVisible(tabId, result)).map((tabId) => {
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

      {activeTab === "below_minimum" ? (
        <EmployeeTable
          rows={result.below_minimum}
          showGapToMinimum
          departmentFilter={departmentFilter}
          search={search}
          onDepartmentSelect={toggleDepartmentFilter}
        />
      ) : null}
      {activeTab === "above_maximum" ? (
        <EmployeeTable
          rows={result.above_maximum}
          departmentFilter={departmentFilter}
          search={search}
          onDepartmentSelect={toggleDepartmentFilter}
        />
      ) : null}

      {activeTab === "duplicate_ids" ? (
        filteredDuplicateIds.length === 0 ? (
          <div className="empty-state">No duplicate IDs match your filters.</div>
        ) : (
          <PaginatedSlice items={filteredDuplicateIds}>
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
            onDepartmentSelect={toggleDepartmentFilter}
          />
        </>
      ) : null}

      {activeTab === "compression" ? (
        result.compression.length === 0 ? (
          <div className="empty-state">No salary compression patterns detected.</div>
        ) : filteredCompression.length === 0 ? (
          <div className="empty-state">No compression issues match your filters.</div>
        ) : (
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
        )
      ) : null}

      {activeTab === "managers_below_reports" ? (
        result.managers_below_reports.length === 0 ? (
          <div className="empty-state">No managers paid below direct reports.</div>
        ) : filteredManagers.length === 0 ? (
          <div className="empty-state">No manager inversion issues match your filters.</div>
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
        filterIssueRows(result.missing_bonus_targets).length === 0 &&
        (result.bonus_target_review?.outliers?.length ?? 0) === 0 ? (
          <div className="empty-state">
            {result.column_mapping.bonus_target
              ? "No missing or outlier bonus targets detected."
              : "Map a Bonus Target column to review missing values and level-based outliers."}
          </div>
        ) : (
          <>
            {filterIssueRows(result.missing_bonus_targets).length > 0 ? (
              <>
                <h3 className="equity-section">Missing bonus targets</h3>
                <PaginatedSlice items={filterIssueRows(result.missing_bonus_targets)}>
                  {(pageItems) => (
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
                          {pageItems.map((row) => (
                            <tr key={row.row_number}>
                              <td>{row.row_number}</td>
                              <td>{row.employee_id ?? "—"}</td>
                              <td>{row.employee_name ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </PaginatedSlice>
              </>
            ) : null}
            {(result.bonus_target_review?.outliers?.length ?? 0) > 0 ? (
              <>
                <h3 className="equity-section">Bonus target outliers by level</h3>
                <BonusTargetOutliersPanel review={result.bonus_target_review} />
              </>
            ) : null}
          </>
        )
      ) : null}

      {activeTab === "missing_salary_ranges" ? (
        filterIssueRows(result.missing_salary_ranges).length === 0 ? (
          <div className="empty-state">All rows include salary range minimum and maximum.</div>
        ) : (
          <PaginatedSlice items={filterIssueRows(result.missing_salary_ranges)}>
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

      {activeTab === "invalid_effective_dates" ? (
        filterIssueRows(result.invalid_effective_dates).length === 0 ? (
          <div className="empty-state">All effective dates are valid.</div>
        ) : (
          <PaginatedSlice items={filterIssueRows(result.invalid_effective_dates)}>
            {(pageItems) => (
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
                    {pageItems.map((row) => (
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
            )}
          </PaginatedSlice>
        )
      ) : null}

      {activeTab === "outlier_merit_increases" ? (
        filterIssueRows(result.outlier_merit_increases).length === 0 ? (
          <div className="empty-state">No outlier merit increases detected.</div>
        ) : (
          <PaginatedSlice items={filterIssueRows(result.outlier_merit_increases)}>
            {(pageItems) => (
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
                    {pageItems.map((row) => (
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
            )}
          </PaginatedSlice>
        )
      ) : null}

      {activeTab === "new_hire_merit_flags" ? (
        filterIssueRows(result.new_hire_merit_flags ?? []).length === 0 ? (
          <div className="empty-state">No new-hire merit flags detected.</div>
        ) : (
          <PaginatedSlice items={filterIssueRows(result.new_hire_merit_flags ?? [])}>
            {(pageItems) => (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Hire Date</th>
                      <th>Tenure (days)</th>
                      <th>Merit Increase</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row) => (
                      <tr key={row.row_number}>
                        <td>{row.row_number}</td>
                        <td>{row.employee_id ?? "—"}</td>
                        <td>{row.employee_name ?? "—"}</td>
                        <td>{row.hire_date ?? "—"}</td>
                        <td>{row.tenure_days ?? "—"}</td>
                        <td>{row.merit_increase != null ? `${row.merit_increase}%` : "—"}</td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PaginatedSlice>
        )
      ) : null}

      {activeTab === "merit_compa_flags" ? (
        filteredMeritCompaFlags.length === 0 ? (
          <div className="empty-state">
            No merit vs. compa misalignment flags detected. Employees below 90% compa-ratio with
            below-average merit, or above 110% with above-average merit, appear here.
          </div>
        ) : (
          <>
            <p className="file-meta" style={{ marginBottom: 16 }}>
              Flags employees whose merit increase may not match range positioning — common comp
              review checks for under-correction and over-rewarding.
            </p>
            <PaginatedSlice items={filteredMeritCompaFlags}>
              {(pageItems) => (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Compa-Ratio</th>
                        <th>Merit Increase</th>
                        <th>File Avg Merit</th>
                        <th>Flag</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((row) => (
                        <tr key={row.row_number}>
                          <td>{row.row_number}</td>
                          <td>{row.employee_id ?? "—"}</td>
                          <td>{row.employee_name ?? "—"}</td>
                          <td>{row.department ?? "—"}</td>
                          <td>{row.compa_ratio}%</td>
                          <td>{row.merit_increase}%</td>
                          <td>{row.file_average_merit}%</td>
                          <td>
                            <span className="pill pill-warning">
                              {row.flag_type === "under_correction"
                                ? "Under-correction"
                                : "Over-rewarding"}
                            </span>
                          </td>
                          <td>{row.reason}</td>
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

      {activeTab === "equity_grants" ? (
        !result.column_mapping.equity_grant ? (
          <div className="empty-state">
            Map an <strong>Equity / LTI grant %</strong> column to review grant values and outliers.
          </div>
        ) : filteredEquityGrants.length === 0 ? (
          <div className="empty-state">
            Equity grant column is mapped but no populated values match your filters.
          </div>
        ) : (
          <>
            <p className="file-meta" style={{ marginBottom: 16 }}>
              {filteredEquityGrants.length}{" "}
              {filteredEquityGrants.length === 1 ? "grant" : "grants"}
              {equityGrantOutliers > 0
                ? ` · ${equityGrantOutliers} outlier${equityGrantOutliers === 1 ? "" : "s"} flagged`
                : " · no statistical outliers"}
              . Outliers fall outside the expected spread for this file.
            </p>
            <PaginatedSlice items={filteredEquityGrants}>
              {(pageItems) => (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Equity Grant %</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((row) => (
                        <tr key={row.row_number}>
                          <td>{row.row_number}</td>
                          <td>{row.employee_id ?? "—"}</td>
                          <td>{row.employee_name ?? "—"}</td>
                          <td>
                            {row.department ? (
                              <button
                                type="button"
                                className={`department-link${
                                  departmentFilter === row.department ? " department-link--active" : ""
                                }`}
                                onClick={() => toggleDepartmentFilter(row.department!)}
                              >
                                {row.department}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{row.equity_grant}%</td>
                          <td>
                            {row.is_outlier ? (
                              <span className="pill pill-warning">Outlier</span>
                            ) : (
                              <span className="pill">OK</span>
                            )}
                          </td>
                          <td>{row.reason ?? "—"}</td>
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

      {activeTab === "unusual_comp_changes" ? (
        filteredPromotionChanges.length === 0 ? (
          <div className="empty-state">No unusual promotion increases detected.</div>
        ) : (
          <PaginatedSlice items={filteredPromotionChanges}>
            {(pageItems) => (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Promotion %</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row) => (
                      <tr key={`${row.row_number}-${row.change_type}`}>
                        <td>{row.row_number}</td>
                        <td>{row.employee_id ?? "—"}</td>
                        <td>{row.employee_name ?? "—"}</td>
                        <td>{row.value_percent}%</td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PaginatedSlice>
        )
      ) : null}

      {activeTab === "compa_ratio" ? (
        filteredCompaRatios.length === 0 ? (
          <div className="empty-state">No compa-ratio values match your filters.</div>
        ) : (
          <PaginatedSlice items={filteredCompaRatios}>
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

      {activeTab === "peer_spread" ? (
        <PeerSpreadPanel report={result.peer_spread} />
      ) : null}

      {activeTab === "post_merit_compa" ? (
        <PostMeritCompaPanel report={result.post_merit_compa} />
      ) : null}

      {activeTab === "pay_equity" ? (
        <PayEquityPanel payEquity={result.pay_equity} departmentFilter={departmentFilter} />
      ) : null}

      {activeTab === "tenure" ? <TenurePanel report={result.tenure} /> : null}

      {activeTab === "location_pay" ? <LocationPayPanel report={result.location_pay} /> : null}

      {activeTab === "missing_data" ? (
        filterIssueRows(result.missing_data).length === 0 ? (
          <div className="empty-state">All required compensation fields are present.</div>
        ) : (
          <PaginatedSlice items={filterIssueRows(result.missing_data)}>
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
