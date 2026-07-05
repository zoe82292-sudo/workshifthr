import type { AnalysisResult, AnalysisTab } from "../types";
import { PENETRATION_BAND_LABELS } from "../types";
import { useSortableRows } from "../useSortableRows";
import { exportReportExcel, exportSummaryPdf } from "../exportActions";
import { saveAnalysisHistory } from "../api";
import {
  buildDepartmentLookup,
  collectDepartments,
  employeeInDepartment,
  rowPassesCoreFilter,
  textMatchesSearch,
} from "../analysisFilters";
import {
  BonusTargetOutliersPanel,
  PeerSpreadPanel,
  PostMeritCompaPanel,
} from "./CompPlanningPanels";
import {
  CompaPenetrationSummaryPanel,
  CurrencyReportPanel,
  EmployeeTypePanel,
  GeoPayPolicyPanel,
  MeritMatrixPanel,
  MidpointProgressionPanel,
  NewHirePlacementPanel,
  PerformanceMeritPanel,
  RangeStructurePanel,
  TotalCashCompPanel,
} from "./CompTier1Panels";
import { ColumnMappingSummary } from "./ColumnMappingSummary";
import { CycleReadinessPanel } from "./CycleReadinessPanel";
import { ReviewQueuePanel } from "./ReviewQueuePanel";
import { PayEquityPanel } from "./PayEquityPanel";
import {
  TAB_GROUPS,
  TABS_BY_ID,
  formatTabCount,
  tabIsVisible,
  tabSeverity,
} from "../tabConfig";
import { LocationPayPanel, TenurePanel } from "./TenureLocationPanels";
import { useMemo, useState, useCallback, useEffect, type ReactNode } from "react";
import { TablePagination, useTablePagination } from "./TablePagination";

interface ResultsDashboardProps {
  result: AnalysisResult;
  activeTab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
  fileName?: string | null;
  authRequired?: boolean;
  trialMode?: boolean;
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
  excludeNonCore = false,
  excludedIds,
  onDepartmentSelect,
}: {
  rows: AnalysisResult["below_minimum"];
  showPenetration?: boolean;
  showGapToMinimum?: boolean;
  departmentFilter?: string;
  search?: string;
  excludeNonCore?: boolean;
  excludedIds?: Set<string>;
  onDepartmentSelect?: (department: string) => void;
}) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        excludeNonCore &&
        excludedIds &&
        !rowPassesCoreFilter(row.employee_id, excludeNonCore, excludedIds)
      ) {
        return false;
      }
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
  }, [rows, departmentFilter, search, excludeNonCore, excludedIds]);

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

export function ResultsDashboard({
  result,
  activeTab,
  onTabChange,
  fileName,
  authRequired = false,
  trialMode = false,
  onHistorySaved,
}: ResultsDashboardProps) {
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [excludeNonCore, setExcludeNonCore] = useState(false);
  const [search, setSearch] = useState("");
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [targetMeritPercent, setTargetMeritPercent] = useState<number | null>(
    () => result.insights.merit_calculator.average_merit_percent ?? 3.5,
  );
  const [anonymizeExports, setAnonymizeExports] = useState(false);

  const departmentLookup = useMemo(() => buildDepartmentLookup(result), [result]);
  const excludedIds = useMemo(
    () => new Set(result.excluded_employee_ids ?? []),
    [result.excluded_employee_ids],
  );
  const hasExcludedEmployees = excludedIds.size > 0;

  const exportOptions = useMemo(
    () => ({ targetMeritPercent, anonymize: anonymizeExports, trialMode }),
    [targetMeritPercent, anonymizeExports, trialMode],
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
          excludeNonCore &&
          !rowPassesCoreFilter(row.employee_id, excludeNonCore, excludedIds)
        ) {
          return false;
        }
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
    [departmentFilter, departmentLookup, excludeNonCore, excludedIds, search],
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

  const visibleTabGroups = useMemo(
    () =>
      TAB_GROUPS.map((group) => ({
        ...group,
        ids: group.ids.filter((tabId) => tabIsVisible(tabId, result)),
      })).filter((group) => group.ids.length > 0),
    [result],
  );

  const [activeTabGroup, setActiveTabGroup] = useState(
    () => visibleTabGroups.find((group) => group.ids.includes(activeTab))?.title ?? visibleTabGroups[0]?.title ?? "",
  );

  useEffect(() => {
    const group = visibleTabGroups.find((item) => item.ids.includes(activeTab));
    if (group) {
      setActiveTabGroup(group.title);
    }
  }, [activeTab, visibleTabGroups]);

  const currentTabGroup = visibleTabGroups.find((group) => group.title === activeTabGroup) ?? visibleTabGroups[0];

  function selectTabGroup(title: string) {
    setActiveTabGroup(title);
    const group = visibleTabGroups.find((item) => item.title === title);
    if (!group) return;
    if (!group.ids.includes(activeTab)) {
      onTabChange(group.ids[0]);
    }
  }

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
      {trialMode ? (
        <div className="alert alert-info trial-export-banner">
          <strong>Free trial export.</strong> PDF and Excel downloads include a trial watermark.
          <a href="/#pricing"> Upgrade</a> for unlimited rows, multi-file merge, team access, and
          full exports.
        </div>
      ) : null}
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

      <CycleReadinessPanel
        result={result}
        onNavigateTab={onTabChange}
        onTargetMeritChange={setTargetMeritPercent}
        targetMeritPercent={targetMeritPercent}
      />

      <div className="summary-grid card-grid card-grid--4 cycle-stat-cards" aria-label="Priority counts">
        {[
          {
            tab: "review_queue" as AnalysisTab,
            label: "Review queue",
            count: result.review_queue.total_items,
            meta: `${result.review_queue.critical_count} critical`,
            tone: "",
          },
          {
            tab: "below_minimum" as AnalysisTab,
            label: "Below minimum",
            count: result.summary.below_minimum,
            tone: "stat-card--danger",
          },
          {
            tab: "merit_matrix" as AnalysisTab,
            label: "Merit matrix",
            count: result.summary.merit_matrix_flags ?? 0,
            tone: "stat-card--warning",
          },
          {
            tab: "peer_spread" as AnalysisTab,
            label: "Peer spread",
            count: result.summary.peer_spread_flags ?? 0,
            tone: "",
          },
          {
            tab: "new_hire_placement" as AnalysisTab,
            label: "New hires below range",
            count: result.summary.new_hire_placement_flags ?? 0,
            tone: "",
          },
          {
            tab: "range_structure" as AnalysisTab,
            label: "Range structure",
            count: result.summary.range_structure_issues ?? 0,
            tone: "",
          },
          {
            tab: "performance_merit" as AnalysisTab,
            label: "Performance × merit",
            count: result.summary.performance_merit_flags ?? 0,
            tone: "",
          },
          {
            tab: "pay_equity" as AnalysisTab,
            label: "Pay equity gaps",
            count: result.summary.pay_equity_gaps,
            tone: "stat-card--info",
          },
        ]
          .filter(
            (card) =>
              card.tab === "review_queue" ||
              card.count > 0 ||
              tabIsVisible(card.tab, result),
          )
          .map((card) => (
            <button
              key={card.tab}
              type="button"
              className={`summary-card stat-card stat-card--clickable ${card.tone ?? ""}`.trim()}
              onClick={() => onTabChange(card.tab)}
            >
              <span className="stat-card__label">{card.label}</span>
              <strong className="stat-card__value">{card.count}</strong>
              {card.meta ? <span className="stat-card__meta">{card.meta}</span> : null}
            </button>
          ))}
      </div>

      <div className="results-sticky-toolbar">
        <div className="table-filters">
          {departments.length > 0 ? (
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
          ) : null}
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
          {hasExcludedEmployees ? (
            <label className="table-filters__checkbox">
              <input
                type="checkbox"
                checked={excludeNonCore}
                onChange={(event) => setExcludeNonCore(event.target.checked)}
              />
              <span>Hide interns & contractors</span>
            </label>
          ) : null}
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
      </div>

      <div className="results-tab-nav" role="tablist" aria-label="Issue categories">
        <div className="tab-category-nav">
          {visibleTabGroups.map((group) => (
            <button
              key={group.title}
              type="button"
              className={`tab-category ${activeTabGroup === group.title ? "active" : ""}`}
              onClick={() => selectTabGroup(group.title)}
            >
              {group.title}
            </button>
          ))}
        </div>
        {currentTabGroup ? (
          <div className="tab-group__tabs">
            {currentTabGroup.ids.map((tabId) => {
              const tab = TABS_BY_ID[tabId];
              const count = tab.count(result);
              const severity = tabSeverity(count, tab.countKind);
              return (
                <button
                  key={tabId}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tabId}
                  className={`tab tab--${severity} ${activeTab === tabId ? "active" : ""}`}
                  onClick={() => onTabChange(tabId)}
                >
                  <span className={`tab-severity tab-severity--${severity}`} aria-hidden />
                  {tab.label} ({formatTabCount(tab, count)})
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="results-tab-content">
      {activeTab === "review_queue" ? (
        <ReviewQueuePanel
          result={result}
          onNavigateTab={onTabChange}
          departmentFilter={departmentFilter}
          search={search}
        />
      ) : null}

      {activeTab === "below_minimum" ? (
        <EmployeeTable
          rows={result.below_minimum}
          showGapToMinimum
          departmentFilter={departmentFilter}
          search={search}
          excludeNonCore={excludeNonCore}
          excludedIds={excludedIds}
          onDepartmentSelect={toggleDepartmentFilter}
        />
      ) : null}
      {activeTab === "above_maximum" ? (
        <EmployeeTable
          rows={result.above_maximum}
          departmentFilter={departmentFilter}
          search={search}
          excludeNonCore={excludeNonCore}
          excludedIds={excludedIds}
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
            excludeNonCore={excludeNonCore}
            excludedIds={excludedIds}
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

      {activeTab === "merit_matrix" ? (
        <MeritMatrixPanel report={result.merit_matrix} />
      ) : null}

      {activeTab === "performance_merit" ? (
        <PerformanceMeritPanel report={result.performance_merit} />
      ) : null}

      {activeTab === "range_structure" ? (
        <RangeStructurePanel report={result.range_structure} />
      ) : null}

      {activeTab === "compa_summary" ? (
        <CompaPenetrationSummaryPanel summary={result.compa_penetration_summary} />
      ) : null}

      {activeTab === "total_cash_comp" ? (
        <TotalCashCompPanel report={result.total_cash_comp} />
      ) : null}

      {activeTab === "new_hire_placement" ? (
        <NewHirePlacementPanel report={result.new_hire_placement} />
      ) : null}

      {activeTab === "geo_pay_policy" ? (
        <GeoPayPolicyPanel report={result.geo_pay_policy} />
      ) : null}

      {activeTab === "currency_report" ? (
        <CurrencyReportPanel report={result.currency_report} />
      ) : null}

      {activeTab === "employee_types" ? (
        <EmployeeTypePanel report={result.employee_type_report} />
      ) : null}

      {activeTab === "midpoint_progression" ? (
        <MidpointProgressionPanel report={result.midpoint_progression} />
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
      </div>
    </>
  );
}
