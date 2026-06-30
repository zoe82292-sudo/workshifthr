import { useEffect, useRef, useState } from "react";
import { analyzeFile, checkBackendHealth } from "../api";
import { ResultsDashboard } from "./ResultsDashboard";
import { BrandLogo } from "./BrandLogo";
import { LegalConsentLinks } from "./LegalConsentLinks";
import { LegalFooter } from "./LegalFooter";
import type { AnalysisResult, AnalysisTab } from "../types";

function pickInitialTab(analysis: AnalysisResult): AnalysisTab {
  if (analysis.pay_equity.available && analysis.summary.pay_equity_gaps > 0) {
    return "pay_equity";
  }
  if (analysis.summary.below_minimum > 0) return "below_minimum";
  if (analysis.summary.above_maximum > 0) return "above_maximum";
  if (analysis.summary.duplicate_ids > 0) return "duplicate_ids";
  if (analysis.summary.managers_below_reports > 0) return "managers_below_reports";
  return "range_penetration";
}

type AnalyzerAppProps = {
  authRequired: boolean;
  userEmail: string | null;
  userOrganization?: string | null;
  onLogout: () => void;
};

export function AnalyzerApp({
  authRequired,
  userEmail,
  userOrganization,
  onLogout,
}: AnalyzerAppProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("below_minimum");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [uploadAuthorized, setUploadAuthorized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void checkBackendHealth().then(setBackendReady);
  }, []);

  async function handleFile(selected: File | null) {
    if (!selected) return;

    if (!uploadAuthorized) {
      setError(
        "Please confirm you are authorized to upload this compensation data before continuing.",
      );
      return;
    }

    if (!/\.(xlsx|xls|csv)$/i.test(selected.name)) {
      setError("Please upload an .xlsx, .xls, or .csv file.");
      return;
    }

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
          <div className="hero-brand">
            <BrandLogo size="nav" />
            <span className="landing-logo-text">
              ShiftWorks<span className="landing-logo-text-hr">HR</span>
            </span>
            <span className="hero-badge">Compensation intelligence</span>
          </div>
          {authRequired && userEmail ? (
            <div className="session-bar">
              <div className="session-user">
                {userOrganization ? (
                  <span className="session-org">{userOrganization}</span>
                ) : null}
                <span className="session-email">{userEmail}</span>
              </div>
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
          ShiftWorksHR automatically flags out-of-range pay, duplicate IDs, range penetration,
          salary compression, manager pay inversions, missing data, and budget impact.
        </p>
      </header>

      {backendReady === false ? (
        <div className="alert alert-error">
          The ShiftWorksHR server is not running. In Terminal, run{" "}
          <code>cd ~/Desktop/WorkShiftHR && ./start.sh</code>, then open{" "}
          <a href="http://localhost:8080">http://localhost:8080</a>.
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h2>Upload compensation file</h2>
          {file ? <span className="pill pill-success">{file.name}</span> : null}
        </div>

        <div className="upload-consent-block">
          <label className="legal-consent-checkbox">
            <input
              type="checkbox"
              checked={uploadAuthorized}
              onChange={(event) => {
                setUploadAuthorized(event.target.checked);
                if (event.target.checked) {
                  setError(null);
                }
              }}
            />
            <span>
              I confirm I am authorized to upload this compensation data on behalf of my
              organization, and I have read the <LegalConsentLinks />.
            </span>
          </label>
        </div>

        <div
          className={`upload-zone ${dragging ? "dragging" : ""} ${uploadAuthorized ? "" : "upload-zone--locked"}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!uploadAuthorized) {
              setError(
                "Please confirm you are authorized to upload this compensation data before continuing.",
              );
              return;
            }
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
            <label className={`button button-primary ${uploadAuthorized ? "" : "button-disabled"}`}>
              {loading ? "Analyzing..." : "Choose file"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={loading || !uploadAuthorized}
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
            Upload your <strong>original employee compensation spreadsheet</strong> — not a
            ShiftWorksHR results export. Column headers are optional: ShiftWorksHR auto-detects
            employee ID, salary, and pay range columns from your data. Add{" "}
            <strong>Gender</strong> and <strong>Race/Ethnicity</strong> for pay equity analysis.
          </p>
          <p className="file-meta legal-notice">
            For decision support only — not legal or professional compensation advice.
            Uploaded files are processed in memory and not stored on our servers after
            analysis. See our <a href="/security">Security &amp; Data Handling</a> page
            for details.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="alert alert-info">
          Analyzing your file — this usually takes a few seconds. If the site just woke up,
          it can take up to a minute.
        </div>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}

      {result ? (
        <section className="panel" id="sample-output-root">
          {result.warnings.map((warning) => (
            <div className="alert alert-warning" key={warning}>
              {warning}
            </div>
          ))}

          {!result.pay_equity.available ? (
            <div className="alert alert-info">
              <strong>Pay equity:</strong> Add <strong>Gender</strong> and/or{" "}
              <strong>Race/Ethnicity</strong> columns to your spreadsheet to see median pay
              comparisons. Then click the <strong>Pay Equity</strong> tab above.
            </div>
          ) : null}

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
