import type { AnalysisResult } from "./types";
import type { ExportOptions } from "./exportAnalysis";

export async function exportAnalysisExcel(
  result: AnalysisResult,
  filename?: string,
  options?: ExportOptions,
) {
  const { downloadAnalysisExcel } = await import("./exportAnalysis");
  downloadAnalysisExcel(result, filename, options);
}

export async function exportAnalysisPdf(
  result: AnalysisResult,
  filename?: string,
  options?: ExportOptions,
) {
  const { downloadAnalysisPdf } = await import("./exportAnalysis");
  downloadAnalysisPdf(result, filename, options);
}

export async function exportExecutiveSummaryPdf(
  result: AnalysisResult,
  filename?: string,
  options?: ExportOptions,
) {
  const { downloadExecutiveSummaryPdf } = await import("./exportAnalysis");
  downloadExecutiveSummaryPdf(result, filename, options);
}

export async function exportExecutiveSummaryExcel(
  result: AnalysisResult,
  filename?: string,
  options?: ExportOptions,
) {
  const { downloadExecutiveSummaryExcel } = await import("./exportAnalysis");
  downloadExecutiveSummaryExcel(result, filename, options);
}
