import type { AnalysisResult } from "./types";
import type { ExportOptions } from "./exportAnalysis";

export async function exportReportExcel(
  result: AnalysisResult,
  filename?: string,
  options?: ExportOptions,
) {
  const { downloadReportExcel } = await import("./exportAnalysis");
  downloadReportExcel(result, filename, options);
}

export async function exportSummaryPdf(
  result: AnalysisResult,
  filename?: string,
  options?: ExportOptions,
) {
  const { downloadSummaryPdf } = await import("./exportAnalysis");
  downloadSummaryPdf(result, filename, options);
}
