import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDemoAnalysis } from "../api";
import { pickInitialTab } from "../analysisNavigation";
import type { AnalysisResult, AnalysisTab } from "../types";
import { ResultsDashboard } from "./ResultsDashboard";

type SampleAnalysisEmbedProps = {
  fileName?: string;
  className?: string;
  result?: AnalysisResult | null;
};

/** Live demo using the same ResultsDashboard customers see after upload. */
export function SampleAnalysisEmbed({
  fileName = "compensation-sample.csv",
  className = "",
  result: resultProp,
}: SampleAnalysisEmbedProps) {
  const [result, setResult] = useState<AnalysisResult | null>(resultProp ?? null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("below_minimum");

  useEffect(() => {
    if (resultProp) {
      setResult(resultProp);
      setActiveTab(pickInitialTab(resultProp));
      return;
    }
    void fetchDemoAnalysis().then((analysis) => {
      setResult(analysis);
      setActiveTab(pickInitialTab(analysis));
    });
  }, [resultProp]);

  if (!result) {
    return <p className="sample-analysis-embed__loading">Loading sample analysis…</p>;
  }

  return (
    <div className={`sample-analysis-embed ${className}`.trim()}>
      <ResultsDashboard
        result={result}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fileName={fileName}
      />
    </div>
  );
}

export function DemoPreviewStats({ result }: { result: AnalysisResult }) {
  const { summary, insights } = result;
  return (
    <div className="landing-preview-stats" aria-label="Sample analysis highlights">
      <article className="landing-preview-stat">
        <strong className="landing-preview-stat__value">{summary.below_minimum}</strong>
        <span className="landing-preview-stat__label">Below range minimum</span>
        <span className="landing-preview-stat__meta">
          ${insights.cost_metrics.total_gap_to_minimum.toLocaleString()} to floor
        </span>
      </article>
      <article className="landing-preview-stat">
        <strong className="landing-preview-stat__value">
          {summary.compression_issues + summary.managers_below_reports}
        </strong>
        <span className="landing-preview-stat__label">Structural issues</span>
        <span className="landing-preview-stat__meta">
          {summary.compression_issues} compression · {summary.managers_below_reports} inversions
        </span>
      </article>
      <article className="landing-preview-stat">
        <strong className="landing-preview-stat__value">
          ${Math.round(insights.budget_impact.total_budget_impact / 1000)}k
        </strong>
        <span className="landing-preview-stat__label">Budget exposure</span>
        <span className="landing-preview-stat__meta">Adjustments + projected merit pool</span>
      </article>
    </div>
  );
}

import { MarketingPreview } from "./MarketingPreview";

export function LandingSamplePreview() {
  return (
    <div className="landing-sample-preview">
      <MarketingPreview focus="full" className="landing-sample-preview__dashboard" />
      <div className="landing-preview-actions">
        <Link className="button button-primary" to="/sample-preview">
          Open full interactive sample
        </Link>
      </div>
    </div>
  );
}
