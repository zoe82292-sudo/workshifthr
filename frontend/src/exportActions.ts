import type { AnalysisResult } from "./types";

export async function exportAnalysisExcel(result: AnalysisResult, filename?: string) {
  const { downloadAnalysisExcel } = await import("./exportAnalysis");
  downloadAnalysisExcel(result, filename);
}

export async function exportAnalysisPdf(result: AnalysisResult, filename?: string) {
  const { downloadAnalysisPdf } = await import("./exportAnalysis");
  downloadAnalysisPdf(result, filename);
}

export async function exportExecutiveSummaryPdf(result: AnalysisResult, filename?: string) {
  const { downloadExecutiveSummaryPdf } = await import("./exportAnalysis");
  downloadExecutiveSummaryPdf(result, filename);
}

export async function exportExecutiveSummaryExcel(result: AnalysisResult, filename?: string) {
  const { downloadExecutiveSummaryExcel } = await import("./exportAnalysis");
  downloadExecutiveSummaryExcel(result, filename);
}
