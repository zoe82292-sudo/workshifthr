import { useMemo } from "react";
import type { AnalysisHistorySummary, AnalysisResult } from "../types";
import { compareAnalysisResults } from "../cycleComparison";

type CycleComparisonPanelProps = {
  current: AnalysisResult;
  historyItems: AnalysisHistorySummary[];
  compareHistoryId: string;
  onCompareHistoryIdChange: (id: string) => void;
  priorResult: AnalysisResult | null;
  priorLoading: boolean;
  onLoadPrior: (id: string) => void;
};

function formatDelta(delta: number) {
  if (delta === 0) return "—";
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta}`;
}

export function CycleComparisonPanel({
  current,
  historyItems,
  compareHistoryId,
  onCompareHistoryIdChange,
  priorResult,
  priorLoading,
  onLoadPrior,
}: CycleComparisonPanelProps) {
  const comparison = useMemo(() => {
    if (!priorResult || !compareHistoryId) return null;
    const item = historyItems.find((entry) => entry.id === compareHistoryId);
    return compareAnalysisResults(
      current,
      priorResult,
      item ? `${item.file_name} (${new Date(item.saved_at).toLocaleDateString()})` : "Prior run",
    );
  }, [compareHistoryId, current, historyItems, priorResult]);

  if (historyItems.length === 0) {
    return null;
  }

  return (
    <section className="panel cycle-comparison-panel">
      <div className="panel-header">
        <div>
          <h2>Compare to prior run</h2>
          <p className="cycle-comparison-panel__copy">
            Select a saved analysis to see how issue counts and below-minimum employees changed.
          </p>
        </div>
      </div>

      <label className="field cycle-comparison-panel__select">
        <span>Prior saved analysis</span>
        <select
          value={compareHistoryId}
          onChange={(event) => {
            const nextId = event.target.value;
            onCompareHistoryIdChange(nextId);
            if (nextId) {
              void onLoadPrior(nextId);
            }
          }}
        >
          <option value="">— Select a saved run —</option>
          {historyItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.file_name} · {new Date(item.saved_at).toLocaleString()} · {item.below_minimum}{" "}
              below min
            </option>
          ))}
        </select>
      </label>

      {priorLoading ? <div className="alert alert-info">Loading prior analysis…</div> : null}

      {comparison ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Current</th>
                  <th>{comparison.priorLabel}</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {comparison.metrics.map((metric) => (
                  <tr key={metric.label}>
                    <td>{metric.label}</td>
                    <td>{metric.current}</td>
                    <td>{metric.prior}</td>
                    <td>{formatDelta(metric.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comparison.employeeChanges.length > 0 ? (
            <div className="cycle-comparison-changes">
              <h3>Below-minimum employee changes</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Change</th>
                      <th>Current salary</th>
                      <th>Prior salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.employeeChanges.map((row) => (
                      <tr key={`${row.employee_id}-${row.change}`}>
                        <td>{row.employee_id}</td>
                        <td>{row.employee_name ?? "—"}</td>
                        <td>
                          {row.change === "new_below_minimum"
                            ? "New below minimum"
                            : row.change === "resolved_below_minimum"
                              ? "Resolved"
                              : "Still below minimum"}
                        </td>
                        <td>
                          {row.current_salary != null
                            ? row.current_salary.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                              })
                            : "—"}
                        </td>
                        <td>
                          {row.prior_salary != null
                            ? row.prior_salary.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}