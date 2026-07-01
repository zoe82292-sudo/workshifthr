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
    pay_equity_gaps: raw?.pay_equity_gaps ?? 0,
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
    insights: raw.insights ?? EMPTY_INSIGHTS,
    warnings: raw.warnings ?? [],
    managers_below_reports: raw.managers_below_reports ?? [],
    missing_bonus_targets: raw.missing_bonus_targets ?? [],
    missing_salary_ranges: raw.missing_salary_ranges ?? [],
    invalid_effective_dates: raw.invalid_effective_dates ?? [],
    outlier_merit_increases: raw.outlier_merit_increases ?? [],
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
  const response = await fetch(`${API_BASE}/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
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

export async function analyzeFile(
  file: File,
  options?: { columnMapping?: ColumnMapping; sheetName?: string | null },
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
