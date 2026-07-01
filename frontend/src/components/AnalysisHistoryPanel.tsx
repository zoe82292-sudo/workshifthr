import { useEffect, useState } from "react";
import {
  deleteAnalysisHistory,
  fetchAnalysisHistory,
  loadAnalysisHistory,
} from "../api";
import type { AnalysisHistorySummary, AnalysisResult } from "../types";

type AnalysisHistoryPanelProps = {
  authRequired: boolean;
  onLoad: (fileName: string, result: AnalysisResult) => void;
};

export function AnalysisHistoryPanel({ authRequired, onLoad }: AnalysisHistoryPanelProps) {
  const [items, setItems] = useState<AnalysisHistorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!authRequired) return;
    setLoading(true);
    void fetchAnalysisHistory()
      .then(setItems)
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to load saved analyses.");
      })
      .finally(() => setLoading(false));
  }, [authRequired]);

  if (!authRequired) {
    return null;
  }

  async function openItem(item: AnalysisHistorySummary) {
    setOpeningId(item.id);
    setError(null);
    try {
      const detail = await loadAnalysisHistory(item.id);
      onLoad(detail.file_name, detail.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open saved analysis.");
    } finally {
      setOpeningId(null);
    }
  }

  async function removeItem(item: AnalysisHistorySummary) {
    const confirmed = window.confirm(
      `Delete saved analysis "${item.file_name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      await deleteAnalysisHistory(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete saved analysis.");
    }
  }

  return (
    <section className="panel analysis-history">
      <div className="panel-header">
        <h2>Saved analyses</h2>
        <span className="pill">{items.length} saved</span>
      </div>
      <p className="analysis-history__intro">
        Saved runs are stored on the server for your account when you click Save to history. Only you
        can view or delete your saved analyses.
      </p>

      {loading ? <p className="file-meta">Loading saved analyses…</p> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {!loading && items.length === 0 ? (
        <p className="file-meta">No saved analyses yet. Run an analysis and click “Save to history”.</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="analysis-history__list">
          {items.map((item) => (
            <li className="analysis-history__item" key={item.id}>
              <div>
                <strong>{item.file_name}</strong>
                <p className="analysis-history__meta">
                  {new Date(item.saved_at).toLocaleString()} · {item.total_rows} rows ·{" "}
                  {item.below_minimum} below minimum · {item.risk_level} risk
                </p>
                <p className="analysis-history__meta">Saved by {item.saved_by}</p>
              </div>
              <div className="analysis-history__actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  disabled={openingId === item.id}
                  onClick={() => void openItem(item)}
                >
                  {openingId === item.id ? "Opening…" : "Open"}
                </button>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => void removeItem(item)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
