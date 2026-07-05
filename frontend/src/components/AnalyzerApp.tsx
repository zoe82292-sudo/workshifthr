import { useEffect, useRef, useState } from "react";
import {
  analyzeBatch,
  analyzeFile,
  checkBackendHealth,
  clearAnalysisSnapshot,
  fetchAccountInfo,
  fetchAnalysisHistory,
  fetchSavedColumnMapping,
  loadAnalysisSnapshot,
  openBillingPortal,
  previewBatch,
  previewFile,
  saveAnalysisSnapshot,
  saveSavedColumnMapping,
  loadAnalysisHistory,
  type AccountInfo,
} from "../api";
import { trackEvent } from "../analytics";
import { ColumnMappingStep, mappingIsComplete } from "./ColumnMappingStep";
import { MultiFileMappingStep, batchMappingIsComplete, type UploadMappingEntry } from "./MultiFileMappingStep";
import { AnalysisHistoryPanel } from "./AnalysisHistoryPanel";
import { ResultsDashboard } from "./ResultsDashboard";
import { BrandLogo } from "./BrandLogo";
import { LegalConsentLinks } from "./LegalConsentLinks";
import { TeamPanel } from "./TeamPanel";
import { OnboardingPanel } from "./OnboardingPanel";
import { CycleComparisonPanel } from "./CycleComparisonPanel";
import { LegalFooter } from "./LegalFooter";
import { loadLocalColumnMapping, saveLocalColumnMapping } from "../savedMappingStorage";
import type { AnalysisHistorySummary, AnalysisResult, AnalysisTab, ColumnMapping } from "../types";

function pickInitialTab(analysis: AnalysisResult): AnalysisTab {
  if ((analysis.summary.review_queue_items ?? analysis.review_queue?.total_items ?? 0) > 0) {
    return "review_queue";
  }
  if (analysis.summary.below_minimum > 0) return "below_minimum";
  if (analysis.summary.above_maximum > 0) return "above_maximum";
  if (analysis.summary.duplicate_ids > 0) return "duplicate_ids";
  if (analysis.summary.managers_below_reports > 0) return "managers_below_reports";
  if ((analysis.summary.equity_grant_outliers ?? 0) > 0) return "equity_grants";
  return "range_penetration";
}

function formatPlanExpiry(account: AccountInfo | null): string | null {
  if (!account?.expires_at) return null;
  const expiry = new Date(account.expires_at);
  if (Number.isNaN(expiry.getTime())) return null;
  const dateLabel = expiry.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  if (account.plan_name) {
    return `${account.plan_name} · expires ${dateLabel}`;
  }
  return `Access expires ${dateLabel}`;
}

const MAX_UPLOAD_FILES = 5;

type AnalyzerAppProps = {
  authRequired: boolean;
  trialMode?: boolean;
  trialMaxRows?: number;
  trialMaxFiles?: number;
  userEmail: string | null;
  userOrganization?: string | null;
  onLogout: () => void;
  onExitTrial?: () => void;
};

export function AnalyzerApp({
  authRequired,
  trialMode = false,
  trialMaxRows = 250,
  trialMaxFiles = 1,
  userEmail,
  userOrganization,
  onLogout,
  onExitTrial,
}: AnalyzerAppProps) {
  const maxUploadFiles = trialMode ? trialMaxFiles : MAX_UPLOAD_FILES;
  const [uploads, setUploads] = useState<UploadMappingEntry[]>([]);
  const [analyzedFileName, setAnalyzedFileName] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("below_minimum");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [uploadAuthorized, setUploadAuthorized] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [meritIqrMultiplier, setMeritIqrMultiplier] = useState(1.5);
  const [manualMappingRequired, setManualMappingRequired] = useState(false);
  const [historyItems, setHistoryItems] = useState<AnalysisHistorySummary[]>([]);
  const [compareHistoryId, setCompareHistoryId] = useState("");
  const [priorResult, setPriorResult] = useState<AnalysisResult | null>(null);
  const [priorLoading, setPriorLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<ReturnType<typeof loadAnalysisSnapshot>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void checkBackendHealth().then(setBackendReady);
    setSavedSnapshot(loadAnalysisSnapshot());
  }, []);

  useEffect(() => {
    if (!authRequired || !userEmail) return;
    void fetchAccountInfo()
      .then(setAccountInfo)
      .catch(() => setAccountInfo(null));
  }, [authRequired, userEmail]);

  useEffect(() => {
    if (!authRequired) return;
    void fetchAnalysisHistory()
      .then(setHistoryItems)
      .catch(() => setHistoryItems([]));
  }, [authRequired, historyRefreshKey]);

  function applySavedMapping(
    suggested: ColumnMapping,
    columns: string[],
    saved: ColumnMapping | null,
  ): ColumnMapping {
    if (!saved) return suggested;
    const columnSet = new Set(columns);
    const merged = { ...suggested };
    for (const key of Object.keys(saved) as Array<keyof ColumnMapping>) {
      const value = saved[key];
      if (value && columnSet.has(value)) {
        merged[key] = value;
      }
    }
    return merged;
  }

  async function resolveSavedMapping(): Promise<ColumnMapping | null> {
    const saved = authRequired ? await fetchSavedColumnMapping() : loadLocalColumnMapping();
    if (saved) return saved;
    return null;
  }

  function resetWorkflow() {
    setUploads([]);
    setResult(null);
    setAnalyzedFileName(null);
    setError(null);
    setManualMappingRequired(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function canAutoAnalyze(entries: UploadMappingEntry[]): boolean {
    if (entries.length === 0) {
      return false;
    }
    return entries.length === 1
      ? mappingIsComplete(entries[0].mapping)
      : batchMappingIsComplete(entries);
  }

  async function buildUploadEntry(file: File, saved: ColumnMapping | null): Promise<UploadMappingEntry> {
    const previewResponse = await previewFile(file);
    return {
      file,
      preview: previewResponse,
      mapping: applySavedMapping(
        previewResponse.suggested_mapping,
        previewResponse.columns,
        saved,
      ),
      sheetName: previewResponse.sheet_names[0] ?? null,
    };
  }

  async function handleFilesSelected(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) return;

    if (!uploadAuthorized) {
      setError(
        "Please confirm you are authorized to upload this compensation data before continuing.",
      );
      return;
    }

    const selected = Array.from(fileList).filter((candidate) =>
      /\.(xlsx|xls|csv)$/i.test(candidate.name),
    );
    if (selected.length === 0) {
      setError("Please upload an .xlsx, .xls, or .csv file.");
      return;
    }

    if (trialMode && selected.length > 1) {
      setError(`Free trial supports ${trialMaxFiles} file at a time.`);
      return;
    }

    if (uploads.length + selected.length > maxUploadFiles) {
      setError(`You can upload up to ${maxUploadFiles} file${maxUploadFiles === 1 ? "" : "s"} at a time.`);
      return;
    }

    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const saved = await resolveSavedMapping();

      let entries: UploadMappingEntry[];
      if (selected.length === 1 && uploads.length === 0) {
        entries = [await buildUploadEntry(selected[0], saved)];
        if (trialMode && (entries[0].preview.total_rows ?? 0) > trialMaxRows) {
          throw new Error(
            `Free trial supports up to ${trialMaxRows.toLocaleString()} rows. Your file has ${(entries[0].preview.total_rows ?? 0).toLocaleString()} rows.`,
          );
        }
      } else {
        const batch = await previewBatch(selected);
        const nextEntries = batch.files.map((item, index) => ({
          file: selected[index] ?? selected.find((file) => file.name === item.filename) ?? selected[0],
          preview: item.preview,
          mapping: applySavedMapping(item.preview.suggested_mapping, item.preview.columns, saved),
          sheetName: item.preview.sheet_names[0] ?? null,
        }));
        entries = [...uploads, ...nextEntries];
      }

      if (canAutoAnalyze(entries)) {
        await runAnalysisWithEntries(entries);
      } else {
        setUploads(entries);
        setManualMappingRequired(true);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to read file.";
      setError(message);
      if (message.includes("sign in again") || message.includes("expired")) {
        onLogout();
      }
      if (uploads.length === 0) {
        resetWorkflow();
      }
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSheetChange(index: number, nextSheet: string | null) {
    const entry = uploads[index];
    if (!entry) return;

    setLoading(true);
    setError(null);
    try {
      const previewResponse = await previewFile(entry.file, nextSheet);
      setUploads((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                preview: previewResponse,
                mapping: applySavedMapping(
                  previewResponse.suggested_mapping,
                  previewResponse.columns,
                  item.mapping,
                ),
                sheetName: nextSheet,
              }
            : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read worksheet.");
    } finally {
      setLoading(false);
    }
  }

  function handleMappingChange(index: number, mapping: ColumnMapping) {
    setUploads((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, mapping } : item)),
    );
  }

  function handleRemoveUpload(index: number) {
    setUploads((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function runAnalysisWithEntries(entries: UploadMappingEntry[]) {
    if (entries.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const analysis =
        entries.length === 1
          ? await analyzeFile(entries[0].file, {
              columnMapping: entries[0].mapping,
              sheetName: entries[0].sheetName,
              meritIqrMultiplier,
            })
          : await analyzeBatch(entries, { meritIqrMultiplier });

      const label =
        entries.length === 1
          ? entries[0].file.name
          : entries.map((entry) => entry.file.name).join(" + ");

      setResult(analysis);
      setAnalyzedFileName(label);
      setActiveTab(pickInitialTab(analysis));
      setUploads([]);
      setManualMappingRequired(false);
      saveAnalysisSnapshot(label, analysis);
      setSavedSnapshot(loadAnalysisSnapshot());
      trackEvent("analysis_completed", { rows: analysis.summary.total_rows });
      setHistoryRefreshKey((value) => value + 1);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to analyze file.";
      setError(message);
      setUploads(entries);
      setManualMappingRequired(true);
      if (message.includes("sign in again") || message.includes("expired")) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    await runAnalysisWithEntries(uploads);
  }

  function restoreSnapshot() {
    if (!savedSnapshot) return;
    setUploads([]);
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
    setUploads([]);
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

  async function handleSaveMapping() {
    const primary = uploads[0];
    if (!primary) return;
    if (authRequired) {
      await saveSavedColumnMapping(primary.mapping);
    } else {
      saveLocalColumnMapping(primary.mapping);
    }
  }

  async function handleLoadPriorHistory(historyId: string) {
    setPriorLoading(true);
    setPriorResult(null);
    try {
      const detail = await loadAnalysisHistory(historyId);
      setPriorResult(detail.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load prior analysis.");
    } finally {
      setPriorLoading(false);
    }
  }

  const planExpiryLabel = formatPlanExpiry(accountInfo);

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
          {authRequired && userEmail && !trialMode ? (
            <div className="session-bar">
              <div className="session-user">
                {userOrganization ? (
                  <span className="session-org">{userOrganization}</span>
                ) : null}
                {planExpiryLabel ? (
                  <span className="session-plan-expiry">{planExpiryLabel}</span>
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
          ) : trialMode ? (
            <div className="session-bar">
              <div className="session-user">
                <span className="session-org">Free trial</span>
                <span className="session-email">Up to {trialMaxRows.toLocaleString()} rows · 1 analyze/day · names blurred</span>
              </div>
              <a className="button button-primary button-small" href="/#pricing">
                Upgrade
              </a>
              {onExitTrial ? (
                <button className="button button-secondary button-small" onClick={onExitTrial} type="button">
                  Exit trial
                </button>
              ) : null}
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

      {savedSnapshot && !result && uploads.length === 0 ? (
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

      {authRequired && !trialMode ? (
        <OnboardingPanel hasResult={Boolean(result)} />
      ) : null}

      {authRequired && !trialMode ? (
        <TeamPanel userEmail={userEmail ?? ""} />
      ) : null}

      {authRequired && !trialMode ? (
        <AnalysisHistoryPanel
          key={historyRefreshKey}
          authRequired={authRequired}
          onLoad={loadFromHistory}
        />
      ) : null}

      {!result && uploads.length === 0 ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Upload compensation file{uploads.length > 1 ? "s" : ""}</h2>
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
              if (event.dataTransfer.files?.length) {
                void handleFilesSelected(event.dataTransfer.files);
              }
            }}
          >
            <p>
              Drop your compensation file here — columns are detected automatically, including
              files without a header row.
              {trialMode
                ? ` Free trial: one file, up to ${trialMaxRows.toLocaleString()} rows.`
                : " Upload multiple files when data is split across exports; they're merged on Employee ID."}
            </p>
            <div className="upload-actions">
              <label className={`button button-primary ${uploadAuthorized ? "" : "button-disabled"}`}>
                {loading ? "Reading files…" : trialMode ? "Choose file" : "Choose files"}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={!trialMode}
                  accept=".xlsx,.xls,.csv,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={loading || !uploadAuthorized}
                  onChange={(event) => void handleFilesSelected(event.target.files)}
                />
              </label>
            </div>
            <p className="file-meta">
              Upload your HRIS spreadsheet export as-is — no template or API connection required.
              We auto-detect employee ID, salary, ranges, merit, bonus, hire date, location, and
              more from headers or data patterns.
              {trialMode
                ? ` Trial limited to ${trialMaxFiles} file and ${trialMaxRows.toLocaleString()} rows.`
                : ` Manual mapping only appears if something can't be read. Up to ${maxUploadFiles} files per analysis (merged on Employee ID).`}
            </p>
            <p className="file-meta">
              Optional:{" "}
              <a href="/api/sample-template" download>
                download a sample file
              </a>{" "}
              to preview the analyzer layout.
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

      {!result && uploads.length > 0 && manualMappingRequired ? (
        <section className="panel upload-queue-panel">
          <div className="panel-header">
            <h2>Uploaded files</h2>
            <span className="pill">{uploads.length} selected</span>
          </div>
          <ul className="upload-queue-list">
            {uploads.map((entry) => (
              <li key={entry.file.name}>
                <span>{entry.file.name}</span>
                <button
                  className="button button-secondary button-small"
                  type="button"
                  disabled={loading}
                  onClick={() => handleRemoveUpload(uploads.indexOf(entry))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {uploads.length < maxUploadFiles && !trialMode ? (
            <label className={`button button-secondary button-small ${uploadAuthorized ? "" : "button-disabled"}`}>
              Add another file
              <input
                type="file"
                multiple
                hidden
                accept=".xlsx,.xls,.csv"
                disabled={loading || !uploadAuthorized}
                onChange={(event) => void handleFilesSelected(event.target.files)}
              />
            </label>
          ) : null}
        </section>
      ) : null}

      {!result && uploads.length > 0 && manualMappingRequired && uploads.length === 1 ? (
        <ColumnMappingStep
          fileName={uploads[0].file.name}
          preview={uploads[0].preview}
          mapping={uploads[0].mapping}
          sheetName={uploads[0].sheetName}
          loading={loading}
          onMappingChange={(nextMapping) => handleMappingChange(0, nextMapping)}
          onSheetChange={(next) => void handleSheetChange(0, next)}
          onAnalyze={() => void runAnalysis()}
          onCancel={resetWorkflow}
          canSaveMapping
          onSaveMapping={() => handleSaveMapping()}
          manualRequired
        />
      ) : null}

      {!result && uploads.length > 1 && manualMappingRequired ? (
        <MultiFileMappingStep
          entries={uploads}
          loading={loading}
          onMappingChange={handleMappingChange}
          onSheetChange={(index, sheet) => void handleSheetChange(index, sheet)}
          onAnalyze={() => void runAnalysis()}
          onCancel={resetWorkflow}
          onRemoveFile={handleRemoveUpload}
        />
      ) : null}

      {!result && uploads.length > 0 && manualMappingRequired ? (
        <section className="panel analyzer-options-panel">
          <label className="field analyzer-options-panel__field">
            <span>Merit outlier sensitivity (IQR multiplier: {meritIqrMultiplier.toFixed(1)})</span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={meritIqrMultiplier}
              onChange={(event) => setMeritIqrMultiplier(Number(event.target.value))}
            />
            <span className="field-hint">
              Lower values flag more merit, promotion, and equity outliers. Applies on the next
              analysis run.
            </span>
          </label>
        </section>
      ) : null}

      {loading && uploads.length === 0 && !result ? (
        <div className="alert alert-info">
          Reading your file and running analysis — this usually takes a few seconds. If the site
          just woke up, it can take up to a minute.
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

          {authRequired && !trialMode ? (
            <CycleComparisonPanel
              current={result}
              historyItems={historyItems}
              compareHistoryId={compareHistoryId}
              onCompareHistoryIdChange={setCompareHistoryId}
              priorResult={priorResult}
              priorLoading={priorLoading}
              onLoadPrior={handleLoadPriorHistory}
            />
          ) : null}

          {!result.pay_equity.available ? (
            <div className="alert alert-info">
              <strong>Pay equity:</strong> Add <strong>Gender</strong> and/or{" "}
              <strong>Race/Ethnicity</strong> columns to your spreadsheet to see median pay
              comparisons. Then click the <strong>Pay Equity</strong> tab above.
            </div>
          ) : null}

          {!result.tenure.available && !result.column_mapping.hire_date ? (
            <div className="alert alert-info">
              <strong>Tenure:</strong> Add a <strong>Hire Date</strong> or{" "}
              <strong>Start Date</strong> column to see pay by tenure band and tenure pay flags
              under <strong>Workforce insights</strong>.
            </div>
          ) : null}

          {!result.location_pay.available && !result.column_mapping.location ? (
            <div className="alert alert-info">
              <strong>Location pay:</strong> Add a <strong>Work Location</strong>,{" "}
              <strong>City</strong>, or <strong>Office</strong> column to compare median pay
              across locations under <strong>Workforce insights</strong>.
            </div>
          ) : null}

          <ResultsDashboard
            result={result}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            fileName={analyzedFileName}
            authRequired={authRequired && !trialMode}
            trialMode={trialMode || result.trial_mode === true}
            onHistorySaved={() => setHistoryRefreshKey((value) => value + 1)}
          />
        </section>
      ) : null}

      <LegalFooter />
    </div>
  );
}
