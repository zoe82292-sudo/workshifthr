import { useEffect, useRef, useState } from "react";
import { analyzeFile, checkBackendHealth } from "../api";
import { ResultsDashboard } from "./ResultsDashboard";
import { LegalFooter } from "./LegalFooter";
import type { AnalysisResult, AnalysisTab } from "../types";

function pickInitialTab(analysis: AnalysisResult): AnalysisTab {
  if (analysis.summary.below_minimum > 0) return "below_minimum";
  if (analysis.summary.above_maximum > 0) return "above_maximum";
  if (analysis.summary.duplicate_ids > 0) return "duplicate_ids";
  if (analysis.summary.managers_below_reports > 0) return "managers_below_reports";
  return "range_penetration";
}

type AnalyzerAppProps = {
  authRequired: boolean;
  userEmail: string | null;
  onLogout: () => void;
};

export function AnalyzerApp({ authRequired, userEmail, onLogout }: AnalyzerAppProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("below_minimum");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void checkBackendHealth().then(setBackendReady);
  }, []);

  async function handleFile(selected: File | null) {
    if (!selected) return;

    setFile(selected);
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const analysis = await analyzeFile(selected);
      setResult(analysis);
      setActiveTab(pickInitialTab(analysis));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to analyze file.";
      setError(message);
      if (message.includes("sign in again")) {
        onLogout();
      }
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-top">
          <span className="hero-badge">Compensation intelligence</span>
          {authRequired && userEmail ? (
            <div className="session-bar">
              <span className="session-email">{userEmail}</span>
              <button className="button button-secondary button-small" onClick={onLogout}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
        <p className="hero-positioning">
          Upload your compensation spreadsheet and get an instant comp review in under 30
          seconds.
        </p>
        <h1>Find pay equity issues before review season.</h1>
        <p>
          WorkShiftHR automatically flags out-of-range pay, duplicate IDs, range penetration,
          salary compression, manager pay inversions, missing data, and budget impact.
        </p>
      </header>

      {backendReady === false ? (
        <div className="alert alert-error">
          The WorkShiftHR server is not running. In Terminal, run{" "}
          <code>cd ~/Desktop/WorkShiftHR && ./start.sh</code>, then open{" "}
          <a href="http://localhost:8080">http://localhost:8080</a>.
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h2>Upload compensation file</h2>
          {file ? <span className="pill pill-success">{file.name}</span> : null}
        </div>

        <div
          className={`upload-zone ${dragging ? "dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) {
              void handleFile(dropped);
            }
          }}
        >
          <p>
            Drop an `.xlsx`, `.xls`, or `.csv` file here. Analysis starts automatically
            after upload.
          </p>
          <div className="upload-actions">
            <label className="button button-primary">
              {loading ? "Analyzing..." : "Choose file"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                disabled={loading}
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {file ? (
              <button
                className="button button-secondary"
                disabled={loading}
                onClick={clearFile}
              >
                Clear
              </button>
            ) : null}
          </div>
          <p className="file-meta">
            Column headers are detected automatically. Include employee ID, salary,
            range minimum, and range maximum for core checks. Department, job level,
            and other fields are optional.
          </p>
          <p className="file-meta legal-notice">
            For decision support only — not legal or professional compensation advice.
            Uploaded files are processed in memory and not stored on our servers after
            analysis.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="alert alert-info">Analyzing your file — this usually takes a few seconds.</div>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}

      {result ? (
        <section className="panel">
          {result.warnings.map((warning) => (
            <div className="alert alert-warning" key={warning}>
              {warning}
            </div>
          ))}

          <ResultsDashboard
            result={result}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </section>
      ) : null}

      <LegalFooter />
    </div>
  );
}
