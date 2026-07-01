import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDemoAnalysis } from "../api";
import type { AnalysisResult, AnalysisTab } from "../types";
import { BrandLogo } from "./BrandLogo";
import { ResultsDashboard } from "./ResultsDashboard";

export function SamplePreviewPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("below_minimum");

  useEffect(() => {
    void fetchDemoAnalysis().then(setResult);
  }, []);

  return (
    <div className="sample-preview-page">
      <header className="sample-preview-page__header">
        <BrandLogo size="nav" />
        <Link className="legal-back-link" to="/">
          ← Back to ShiftWorksHR
        </Link>
      </header>
      <div className="sample-preview-page__intro">
        <span className="hero-badge">Full product preview</span>
        <h1>The complete analyzer view</h1>
        <p>
          This is the same screen customers see after upload — executive summary, calculators,
          and all issue tabs on sample data.
        </p>
        <p className="sample-preview-page__note">
          Looking for the shorter homepage tour?{" "}
          <Link to="/#see-it-in-action">View the curated demo</Link>.
        </p>
      </div>

      {result ? (
        <div className="sample-preview-page__dashboard panel">
          <ResultsDashboard
            result={result}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      ) : (
        <p className="sample-preview-page__loading">Loading sample analysis…</p>
      )}
    </div>
  );
}
