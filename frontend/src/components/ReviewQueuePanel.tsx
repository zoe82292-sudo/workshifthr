import type { AnalysisResult, AnalysisTab } from "../types";
import { useTablePagination, TablePagination } from "./TablePagination";
import { TrialName, useTrialDisplay } from "../trialDisplay";
import type { ReactNode } from "react";

interface ReviewQueuePanelProps {
  result: AnalysisResult;
  onNavigateTab: (tab: AnalysisTab) => void;
  departmentFilter?: string;
  search?: string;
}

function severityClass(severity: string) {
  return `pill pill-${severity === "critical" ? "danger" : severity === "high" ? "warning" : "info"}`;
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

export function ReviewQueuePanel({
  result,
  onNavigateTab,
  departmentFilter = "",
  search = "",
}: ReviewQueuePanelProps) {
  const queue = result.review_queue;
  const trialMode = useTrialDisplay();
  const query = search.trim().toLowerCase();

  const filtered = queue.items.filter((item) => {
    if (departmentFilter && (item.department ?? "") !== departmentFilter) return false;
    if (!query) return true;
    const haystack = [
      item.employee_id,
      trialMode ? null : item.employee_name,
      item.category,
      item.reason,
      item.department,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  if (!queue.available || queue.items.length === 0) {
    return (
      <div className="empty-state">
        No prioritized review items — your file looks clean for cycle readiness.
      </div>
    );
  }

  return (
    <div className="pay-equity-panel review-queue-panel">
      <p className="file-meta">{queue.disclaimer}</p>
      <div className="review-queue-panel__summary card-grid card-grid--3">
        <div className="summary-card stat-card stat-card--danger">
          <span className="stat-card__label">Critical</span>
          <strong className="stat-card__value">{queue.critical_count}</strong>
        </div>
        <div className="summary-card stat-card stat-card--warning">
          <span className="stat-card__label">High priority</span>
          <strong className="stat-card__value">{queue.high_count}</strong>
        </div>
        <div className="summary-card stat-card">
          <span className="stat-card__label">Total queue</span>
          <strong className="stat-card__value">{queue.total_items}</strong>
        </div>
      </div>

      <PaginatedSlice items={filtered}>
        {(pageItems) => (
          <>
            <div className="table-wrap review-queue-panel__desktop">
              <table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => (
                    <tr key={`${item.row_number}-${item.category}-${index}`}>
                      <td>
                        <span className={severityClass(item.severity)}>{item.severity}</span>
                      </td>
                      <td>{item.category}</td>
                      <td><TrialName value={item.employee_name} fallback={item.employee_id ?? "—"} /></td>
                      <td>{item.department ?? "—"}</td>
                      <td>{item.reason}</td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => onNavigateTab(item.tab_id as AnalysisTab)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="review-queue-panel__mobile">
              {pageItems.map((item, index) => (
                <article
                  className="mobile-data-card"
                  key={`${item.row_number}-${item.category}-${index}`}
                >
                  <div className="mobile-data-card__header">
                    <span className={severityClass(item.severity)}>{item.severity}</span>
                    <strong>{item.category}</strong>
                  </div>
                  <p><TrialName value={item.employee_name} fallback={item.employee_id ?? "—"} /></p>
                  {item.department ? <p className="mobile-data-card__meta">{item.department}</p> : null}
                  <p className="mobile-data-card__reason">{item.reason}</p>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => onNavigateTab(item.tab_id as AnalysisTab)}
                  >
                    View detail
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </PaginatedSlice>
    </div>
  );
}
