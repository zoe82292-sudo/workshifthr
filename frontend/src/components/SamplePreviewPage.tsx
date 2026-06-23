import { useEffect, useState } from "react";
import { fetchDemoAnalysis } from "../api";
import { ResultsDashboard } from "./ResultsDashboard";
import type { AnalysisResult } from "../types";

export function SamplePreviewPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    void fetchDemoAnalysis().then(setResult);
  }, []);

  if (!result) {
    return <div className="app-shell marketing-screenshot-shell">Loading sample analysis...</div>;
  }

  return (
    <div className="app-shell marketing-screenshot-shell">
      <section className="panel" id="sample-output-root">
        <ResultsDashboard
          result={result}
          activeTab="below_minimum"
          onTabChange={() => undefined}
        />
      </section>
    </div>
  );
}
