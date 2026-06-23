import type { AnalysisInsights, AnalysisResult, AnalysisSummary } from "./types";
import { authHeaders, clearSession } from "./auth";

const API_BASE = "/api";

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
  };
}

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

export async function login(email: string, password: string): Promise<{ token: string; email: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as { token: string; email: string };
}

export async function analyzeFile(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/analyze`, {
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

  const payload = (await response.json()) as AnalysisResult;
  return normalizeResult(payload);
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    return "Something went wrong while processing the file.";
  } catch {
    return "Something went wrong while processing the file.";
  }
}
