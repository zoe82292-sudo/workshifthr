import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDemoAnalysis } from "../api";
import type { AnalysisResult, AnalysisTab } from "../types";
import { ResultsDashboard } from "./ResultsDashboard";

type InteractiveDemoPreviewProps = {
  variant?: "embedded" | "full";
};

export function InteractiveDemoPreview({ variant = "embedded" }: InteractiveDemoPreviewProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("below_minimum");

  useEffect(() => {
    void fetchDemoAnalysis()
      .then(setResult)
      .catch(() => setError("Unable to load the sample analysis. Please refresh and try again."));
  }, []);

  if (error) {
    return <p className="interactive-demo__message interactive-demo__message--error">{error}</p>;
  }

  if (!result) {
    return <p className="interactive-demo__message">Loading sample analysis…</p>;
  }

  return (
    <div className={variant === "full" ? "interactive-demo-shell" : "interactive-demo-embed"}>
      {variant === "embedded" ? (
        <p className="interactive-demo__hint">Live demo — click tabs to explore real sample output</p>
      ) : null}
      <ResultsDashboard result={result} activeTab={activeTab} onTabChange={setActiveTab} />
      {variant === "embedded" ? (
        <p className="interactive-demo__footer">
          <Link to="/sample-preview">Open full-screen demo</Link>
        </p>
      ) : null}
    </div>
  );
}
