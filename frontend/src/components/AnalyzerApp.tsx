import { useEffect, useRef, useState } from "react";
import {
  analyzeFile,
  checkBackendHealth,
  clearAnalysisSnapshot,
  loadAnalysisSnapshot,
  openBillingPortal,
  previewFile,
  saveAnalysisSnapshot,
} from "../api";
import { trackEvent } from "../analytics";
import { ColumnMappingStep } from "./ColumnMappingStep";
import { AnalysisHistoryPanel } from "./AnalysisHistoryPanel";
import { ResultsDashboard } from "./ResultsDashboard";
import { BrandLogo } from "./BrandLogo";
import { LegalConsentLinks } from "./LegalConsentLinks";
import { TeamPanel } from "./TeamPanel";
import { OnboardingPanel } from "./OnboardingPanel";
import { LegalFooter } from "./LegalFooter";
import type { AnalysisResult, AnalysisTab, ColumnMapping, PreviewResponse } from "../types";

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
  const [analyzedFileName, setAnalyzedFileName] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("below_minimum");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [uploadAuthorized, setUploadAuthorized] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<ReturnType<typeof loadAnalysisSnapshot>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void checkBackendHealth().then(setBackendReady);
    setSavedSnapshot(loadAnalysisSnapshot());
  }, []);

  function resetWorkflow() {
    setFile(null);
    setPreview(null);
    setMapping(null);
    setSheetName(null);
    setResult(null);
    setAnalyzedFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFileSelected(selected: File | null) {
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
      const previewResponse = await previewFile(selected);
      setPreview(previewResponse);
      setMapping(previewResponse.suggested_mapping);
      setSheetName(previewResponse.sheet_names[0] ?? null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to read file.";
      setError(message);
      if (message.includes("sign in again") || message.includes("expired")) {
        onLogout();
      }
      resetWorkflow();
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function runAnalysis() {
    if (!file || !mapping) return;

    setLoading(true);
    setError(null);

    try {
      const analysis = await analyzeFile(file, { columnMapping: mapping, sheetName });
      setResult(analysis);
      setAnalyzedFileName(file.name);
      setActiveTab(pickInitialTab(analysis));
      setPreview(null);
      saveAnalysisSnapshot(file.name, analysis);
      setSavedSnapshot(loadAnalysisSnapshot());
      trackEvent("analysis_completed", { rows: analysis.summary.total_rows });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to analyze file.";
      setError(message);
      if (message.includes("sign in again") || message.includes("expired")) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSheetChange(nextSheet: string | null) {
    if (!file) return;
    setSheetName(nextSheet);
    setLoading(true);
    setError(null);
    try {
      const previewResponse = await previewFile(file, nextSheet);
      setPreview(previewResponse);
      setMapping(previewResponse.suggested_mapping);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read worksheet.");
    } finally {
      setLoading(false);
    }
  }

  function restoreSnapshot() {
    if (!savedSnapshot) return;
    setFile(null);
    setPreview(null);
    setMapping(null);
    setResult(savedSnapshot.result);
    setAnalyzedFileName(savedSnapshot.fileName);
    setActiveTab(pickInitialTab(savedSnapshot.result));
    setError(null);
  }

  function dismissSnapshot() {
    clearAnalysisSnapshot();
    setSavedSnapshot(null);
  }

  function loadFromHistory(fileName: string, analysis: AnalysisResult) {
    setFile(null);
    setPreview(null);
    setMapping(null);
    setResult(analysis);
    setAnalyzedFileName(fileName);
    setActiveTab(pickInitialTab(analysis));
    setError(null);
    saveAnalysisSnapshot(fileName, analysis);
    setSavedSnapshot(loadAnalysisSnapshot());
  }

  async function handleBillingPortal() {
    setBillingLoading(true);
    setError(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open billing portal.");
    } finally {
      setBillingLoading(false);
    }
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
              <button
                className="button button-secondary button-small"
                disabled={billingLoading}
                onClick={() => void handleBillingPortal()}
                type="button"
              >
                {billingLoading ? "Opening…" : "Billing"}
              </button>
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
          Unable to reach the ShiftWorksHR server. If you just deployed, wait a moment and
          refresh. Still stuck? Email{" "}
          <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>.
        </div>
      ) : null}

      {savedSnapshot && !result && !preview ? (
        <div className="alert alert-info snapshot-restore">
          <p>
            You have a saved analysis from <strong>{savedSnapshot.fileName}</strong> (
            {new Date(savedSnapshot.savedAt).toLocaleString()}).
          </p>
          <div className="snapshot-restore__actions">
            <button className="button button-primary button-small" type="button" onClick={restoreSnapshot}>
              Restore results
            </button>
            <button className="button button-secondary button-small" type="button" onClick={dismissSnapshot}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {authRequired ? (
        <OnboardingPanel hasResult={Boolean(result)} />
      ) : null}

      {authRequired ? (
        <TeamPanel userEmail={userEmail ?? ""} />
      ) : null}

      {authRequired ? (
        <AnalysisHistoryPanel
          key={historyRefreshKey}
          authRequired={authRequired}
          onLoad={loadFromHistory}
        />
      ) : null}

      {!preview && !result ? (
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
                void handleFileSelected(dropped);
              }
            }}
          >
            <p>Drop an `.xlsx`, `.xls`, or `.csv` file here to map columns and run analysis.</p>
            <div className="upload-actions">
              <label className={`button button-primary ${uploadAuthorized ? "" : "button-disabled"}`}>
                {loading ? "Reading file…" : "Choose file"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={loading || !uploadAuthorized}
                  onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null)}
                />
              </label>
              {file ? (
                <button
                  className="button button-secondary"
                  disabled={loading}
                  onClick={resetWorkflow}
                  type="button"
                >
                  Clear
                </button>
              ) : null}
              <a className="button button-secondary" href="/api/sample-template" download>
                Download template
              </a>
            </div>
            <p className="file-meta">
              Required: <strong>Employee ID</strong>, <strong>Salary</strong>,{" "}
              <strong>Range min</strong>, and <strong>Range max</strong>. Range midpoint is
              calculated automatically. Add <strong>Gender</strong> and{" "}
              <strong>Race/Ethnicity</strong> for pay equity analysis.
            </p>
            <p className="file-meta legal-notice">
              For decision support only — not legal or professional compensation advice.
              Uploaded files are processed in memory and are not kept unless you explicitly
              save an analysis to your organization history. See our{" "}
              <a href="/security">Security &amp; Data Handling</a> page for details.
            </p>
          </div>
        </section>
      ) : null}

      {preview && mapping && file ? (
        <ColumnMappingStep
          fileName={file.name}
          preview={preview}
          mapping={mapping}
          sheetName={sheetName}
          loading={loading}
          onMappingChange={setMapping}
          onSheetChange={(next) => void handleSheetChange(next)}
          onAnalyze={() => void runAnalysis()}
          onCancel={resetWorkflow}
        />
      ) : null}

      {loading && !preview ? (
        <div className="alert alert-info">
          Working on your file — this usually takes a few seconds. If the site just woke up,
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
            fileName={analyzedFileName}
            authRequired={authRequired}
            onHistorySaved={() => setHistoryRefreshKey((value) => value + 1)}
          />
        </section>
      ) : null}

      <LegalFooter />
    </div>
  );
}
