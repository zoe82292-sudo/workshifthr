import type {
  AnalysisHistoryDetail,
  AnalysisHistorySummary,
  AnalysisInsights,
  AnalysisResult,
  AnalysisSummary,
  ColumnMapping,
  PreviewResponse,
} from "./types";
import { getBundledDemoAnalysis } from "./data/bundledDemoAnalysis";
import { authHeaders, clearSession } from "./auth";
import { getStoredAttribution } from "./marketingAttribution";

const API_BASE = "/api";
const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;
const ANALYSIS_STORAGE_KEY = "shiftworkshr:lastAnalysis";

function isAllowedUpload(file: File): boolean {
  return ALLOWED_EXTENSIONS.test(file.name);
}

const EMPTY_INSIGHTS: AnalysisInsights = {
  executive_summary: {
    headline: "Analysis completed.",
    bullets: [],
    risk_level: "low",
  },
  cost_metrics: {
    employees_below_minimum: 0,
    total_gap_to_minimum: 0,
    average_gap_to_minimum: 0,
    employees_above_maximum: 0,
    total_above_maximum: 0,
  },
  budget_impact: {
    cost_to_minimum: 0,
    projected_merit_pool: 0,
    total_budget_impact: 0,
    note: "",
  },
  merit_calculator: {
    employees_with_merit_data: 0,
    average_merit_percent: null,
    projected_merit_pool: 0,
    payroll_base: 0,
  },
  compa_ratio: {
    average_compa_ratio: null,
    below_90_percent: 0,
    between_90_and_110: 0,
    above_110_percent: 0,
  },
};

function normalizeSummary(raw: Partial<AnalysisSummary> | undefined): AnalysisSummary {
  return {
    total_rows: raw?.total_rows ?? 0,
    valid_rows: raw?.valid_rows ?? 0,
    below_minimum: raw?.below_minimum ?? 0,
    above_maximum: raw?.above_maximum ?? 0,
    duplicate_ids: raw?.duplicate_ids ?? 0,
    missing_data: raw?.missing_data ?? 0,
    compression_issues: raw?.compression_issues ?? 0,
    average_penetration: raw?.average_penetration ?? null,
    managers_below_reports: raw?.managers_below_reports ?? 0,
    missing_bonus_targets: raw?.missing_bonus_targets ?? 0,
    missing_salary_ranges: raw?.missing_salary_ranges ?? 0,
    invalid_effective_dates: raw?.invalid_effective_dates ?? 0,
    outlier_merit_increases: raw?.outlier_merit_increases ?? 0,
    new_hire_merit_flags: raw?.new_hire_merit_flags ?? 0,
    merit_compa_flags: raw?.merit_compa_flags ?? 0,
    unusual_comp_changes: raw?.unusual_comp_changes ?? 0,
    equity_grant_outliers: raw?.equity_grant_outliers ?? 0,
    pay_equity_gaps: raw?.pay_equity_gaps ?? 0,
    tenure_pay_flags: raw?.tenure_pay_flags ?? 0,
    location_pay_gaps: raw?.location_pay_gaps ?? 0,
    bonus_target_outliers: raw?.bonus_target_outliers ?? 0,
    peer_spread_flags: raw?.peer_spread_flags ?? 0,
    post_merit_compa_rows: raw?.post_merit_compa_rows ?? 0,
  };
}

const EMPTY_PAY_EQUITY = {
  available: false,
  gender_groups: [],
  race_groups: [],
  gender_gaps: [],
  race_gaps: [],
  level_breakdowns: [],
  employees_missing_gender: 0,
  employees_missing_race: 0,
  disclaimer: "",
};

const EMPTY_TENURE = {
  available: false,
  bands: [],
  employees: [],
  flags: [],
  employees_missing_hire_date: 0,
  disclaimer: "",
};

const EMPTY_LOCATION_PAY = {
  available: false,
  location_groups: [],
  location_gaps: [],
  level_breakdowns: [],
  employees_missing_location: 0,
  disclaimer: "",
};

const EMPTY_MERIT_BY_DEPT = {
  available: false,
  departments: [],
  file_average_merit: null,
  disclaimer: "",
};

const EMPTY_BONUS_REVIEW = {
  available: false,
  outliers: [],
  disclaimer: "",
};

const EMPTY_POST_MERIT = {
  available: false,
  employees: [],
  average_current_compa: null,
  average_projected_compa: null,
  employees_below_90_after: 0,
  employees_above_110_after: 0,
  disclaimer: "",
};

const EMPTY_PEER_SPREAD = {
  available: false,
  flags: [],
  spread_threshold: 15,
  disclaimer: "",
};

function normalizeResult(raw: AnalysisResult): AnalysisResult {
  return {
    ...raw,
    summary: normalizeSummary(raw.summary),
    below_minimum: raw.below_minimum ?? [],
    above_maximum: raw.above_maximum ?? [],
    duplicate_ids: raw.duplicate_ids ?? [],
    range_penetration: raw.range_penetration ?? [],
    compression: raw.compression ?? [],
    missing_data: raw.missing_data ?? [],
    compa_ratios: raw.compa_ratios ?? [],
    pay_equity: raw.pay_equity ?? EMPTY_PAY_EQUITY,
    tenure: raw.tenure ?? EMPTY_TENURE,
    location_pay: raw.location_pay ?? EMPTY_LOCATION_PAY,
    merit_by_department: raw.merit_by_department ?? EMPTY_MERIT_BY_DEPT,
    bonus_target_review: raw.bonus_target_review ?? EMPTY_BONUS_REVIEW,
    post_merit_compa: raw.post_merit_compa ?? EMPTY_POST_MERIT,
    peer_spread: raw.peer_spread ?? EMPTY_PEER_SPREAD,
    insights: raw.insights ?? EMPTY_INSIGHTS,
    warnings: raw.warnings ?? [],
    managers_below_reports: raw.managers_below_reports ?? [],
    missing_bonus_targets: raw.missing_bonus_targets ?? [],
    missing_salary_ranges: raw.missing_salary_ranges ?? [],
    invalid_effective_dates: raw.invalid_effective_dates ?? [],
    outlier_merit_increases: raw.outlier_merit_increases ?? [],
    new_hire_merit_flags: raw.new_hire_merit_flags ?? [],
    merit_compa_flags: raw.merit_compa_flags ?? [],
    unusual_comp_changes: raw.unusual_comp_changes ?? [],
    equity_grants: raw.equity_grants ?? [],
    detected_columns: raw.detected_columns ?? [],
    missing_required_columns: raw.missing_required_columns ?? [],
  };
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkAuthStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/status`);
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as { auth_enabled?: boolean };
    return payload.auth_enabled === true;
  } catch {
    return false;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; email: string; organization: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as { token: string; email: string; organization: string };
}

export async function recoverAccess(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/auth/recover-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as { message: string };
}

export type OrgMember = {
  email: string;
  is_self: boolean;
};

export type AccountInfo = {
  email: string;
  organization: string;
  plan_id: string | null;
  plan_name: string | null;
  expires_at: string | null;
};

export async function fetchAccountInfo(): Promise<AccountInfo> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as AccountInfo;
}

export async function fetchOrgMembers(): Promise<{
  organization: string;
  company_domain: string;
  members: OrgMember[];
  can_manage: boolean;
}> {
  const response = await fetch(`${API_BASE}/org/members`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as {
    organization: string;
    company_domain: string;
    members: OrgMember[];
    can_manage: boolean;
  };
}

export async function fetchSavedColumnMapping(): Promise<ColumnMapping | null> {
  try {
    const response = await fetch(`${API_BASE}/org/column-mapping`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { mapping: ColumnMapping | null };
    return payload.mapping;
  } catch {
    return null;
  }
}

export async function saveSavedColumnMapping(mapping: ColumnMapping): Promise<void> {
  const response = await fetch(`${API_BASE}/org/column-mapping`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(mapping),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function addOrgMember(email: string): Promise<{
  email: string;
  members: string[];
  invited: boolean;
}> {
  const response = await fetch(`${API_BASE}/org/members`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as { email: string; members: string[]; invited: boolean };
}

export async function removeOrgMember(email: string): Promise<{ members: string[] }> {
  const response = await fetch(`${API_BASE}/org/members/${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as { members: string[] };
}

export async function openBillingPortal(): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE}/billing/portal`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as { url: string };
}

export type PlanId = "cycle" | "annual" | "monthly";

export async function checkBillingStatus(): Promise<{
  enabled: boolean;
  plans: PlanId[];
  missing?: string[];
}> {
  try {
    const response = await fetch(`${API_BASE}/billing/status`);
    if (!response.ok) {
      return { enabled: false, plans: [] };
    }
    return (await response.json()) as {
      enabled: boolean;
      plans: PlanId[];
      missing?: string[];
    };
  } catch {
    return { enabled: false, plans: [] };
  }
}

export async function startCheckout(planId: PlanId): Promise<{ url: string }> {
  const attribution = getStoredAttribution();
  const response = await fetch(`${API_BASE}/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId, ...attribution }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as { url: string };
}

export async function fetchCheckoutSession(sessionId: string): Promise<{
  email: string | null;
  plan_id: PlanId | null;
  plan_name: string | null;
  status: string;
  organization: string | null;
  password: string | null;
  credentials_emailed: boolean;
}> {
  const response = await fetch(`${API_BASE}/billing/session/${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as {
    email: string | null;
    plan_id: PlanId | null;
    plan_name: string | null;
    status: string;
    organization: string | null;
    password: string | null;
    credentials_emailed: boolean;
  };
}

export async function previewFile(file: File, sheetName?: string | null): Promise<PreviewResponse> {
  if (!isAllowedUpload(file)) {
    throw new Error("Please upload an .xlsx, .xls, or .csv file.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  if (sheetName) {
    formData.append("sheet_name", sheetName);
  }

  const response = await fetch(`${API_BASE}/preview`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as PreviewResponse;
}

export type BatchPreviewResponse = {
  files: Array<{
    filename: string;
    preview: PreviewResponse;
  }>;
};

export async function previewBatch(files: File[]): Promise<BatchPreviewResponse> {
  for (const file of files) {
    if (!isAllowedUpload(file)) {
      throw new Error("Please upload an .xlsx, .xls, or .csv file.");
    }
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const response = await fetch(`${API_BASE}/preview-batch`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as BatchPreviewResponse;
}

export async function analyzeBatch(
  entries: Array<{ file: File; mapping: ColumnMapping; sheetName: string | null }>,
  options?: { meritIqrMultiplier?: number },
): Promise<AnalysisResult> {
  for (const entry of entries) {
    if (!isAllowedUpload(entry.file)) {
      throw new Error("Please upload an .xlsx, .xls, or .csv file.");
    }
  }

  const formData = new FormData();
  const fileSpecs = entries.map((entry) => ({
    filename: entry.file.name,
    sheet_name: entry.sheetName,
    column_mapping: entry.mapping,
  }));

  for (const entry of entries) {
    formData.append("files", entry.file, entry.file.name);
  }
  formData.append("file_specs", JSON.stringify(fileSpecs));
  if (options?.meritIqrMultiplier != null) {
    formData.append("merit_iqr_multiplier", String(options.meritIqrMultiplier));
  }

  const response = await fetch(`${API_BASE}/analyze-batch`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }

  if (response.status === 403) {
    clearSession();
    throw new Error(await readError(response));
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as AnalysisResult;
  return normalizeResult(payload);
}

export async function analyzeFile(
  file: File,
  options?: {
    columnMapping?: ColumnMapping;
    sheetName?: string | null;
    meritIqrMultiplier?: number;
  },
): Promise<AnalysisResult> {
  if (!isAllowedUpload(file)) {
    throw new Error("Please upload an .xlsx, .xls, or .csv file.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  if (options?.sheetName) {
    formData.append("sheet_name", options.sheetName);
  }
  if (options?.columnMapping) {
    formData.append("column_mapping", JSON.stringify(options.columnMapping));
  }
  if (options?.meritIqrMultiplier != null) {
    formData.append("merit_iqr_multiplier", String(options.meritIqrMultiplier));
  }

  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }

  if (response.status === 403) {
    clearSession();
    throw new Error(await readError(response));
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as AnalysisResult;
  return normalizeResult(payload);
}

/** @deprecated Use analyzeFile with options instead */
export function saveAnalysisSnapshot(fileName: string, result: AnalysisResult): void {
  try {
    localStorage.setItem(
      ANALYSIS_STORAGE_KEY,
      JSON.stringify({ fileName, result, savedAt: new Date().toISOString() }),
    );
  } catch {
    // ignore quota errors
  }
}

export function loadAnalysisSnapshot(): {
  fileName: string;
  result: AnalysisResult;
  savedAt: string;
} | null {
  try {
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      fileName: string;
      result: AnalysisResult;
      savedAt: string;
    };
    return {
      fileName: parsed.fileName,
      result: normalizeResult(parsed.result),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearAnalysisSnapshot(): void {
  localStorage.removeItem(ANALYSIS_STORAGE_KEY);
}

export async function fetchDemoAnalysis(): Promise<AnalysisResult> {
  try {
    const response = await fetch(`${API_BASE}/demo-analysis`);
    if (!response.ok) {
      return normalizeResult(getBundledDemoAnalysis());
    }
    const payload = (await response.json()) as AnalysisResult;
    return normalizeResult(payload);
  } catch {
    return normalizeResult(getBundledDemoAnalysis());
  }
}

export async function fetchAnalysisHistory(): Promise<AnalysisHistorySummary[]> {
  const response = await fetch(`${API_BASE}/analysis/history`, {
    headers: authHeaders(),
  });
  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as AnalysisHistorySummary[];
}

export async function saveAnalysisHistory(
  fileName: string,
  result: AnalysisResult,
): Promise<AnalysisHistorySummary> {
  const response = await fetch(`${API_BASE}/analysis/history`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_name: fileName, result }),
  });
  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as AnalysisHistorySummary;
}

export async function loadAnalysisHistory(historyId: string): Promise<AnalysisHistoryDetail> {
  const response = await fetch(`${API_BASE}/analysis/history/${encodeURIComponent(historyId)}`, {
    headers: authHeaders(),
  });
  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const payload = (await response.json()) as AnalysisHistoryDetail;
  return {
    ...payload,
    result: normalizeResult(payload.result),
  };
}

export async function deleteAnalysisHistory(historyId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/analysis/history/${encodeURIComponent(historyId)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (response.status === 401) {
    clearSession();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload.detail)) {
      return payload.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ") ||
        "Something went wrong while processing the file.";
    }
    return "Something went wrong while processing the file.";
  } catch {
    if (response.status === 413) {
      return "This file is too large to upload.";
    }
    if (response.status >= 500) {
      return "The server had trouble processing your file. Wait 30 seconds and try again.";
    }
    return "Something went wrong while processing the file.";
  }
}
