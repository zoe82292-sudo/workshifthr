import demoSnapshot from "./demo-analysis.snapshot.json";
import type { AnalysisResult } from "../types";

/** Offline fallback when /api/demo-analysis is unavailable. Regenerate with npm run sync:demo */
export function getBundledDemoAnalysis(): AnalysisResult {
  return demoSnapshot as AnalysisResult;
}
