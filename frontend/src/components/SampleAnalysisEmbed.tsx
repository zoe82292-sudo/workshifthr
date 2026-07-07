import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDemoAnalysis } from "../api";
import { pickInitialTab } from "../analysisNavigation";
import { useIsMobile } from "../useMediaQuery";
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

export function LandingSamplePreview() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    void fetchDemoAnalysis().then(setResult);
  }, []);

  if (!result) {
    return <p className="sample-analysis-embed__loading">Loading sample analysis…</p>;
  }

  if (isMobile) {
    return (
      <div className="landing-sample-mobile">
        <figure className="landing-sample-mobile-shot">
          <img
            src="/demo-mobile-preview.png"
            alt="ShiftWorksHR review queue and below-minimum flags on sample compensation data"
            width={390}
            height={844}
            loading="lazy"
          />
        </figure>
        <DemoPreviewStats result={result} />
        <div className="landing-sample-mobile-cta panel">
          <p>
            See the full results dashboard — review queue, pay equity, exports, and every analysis tab.
          </p>
          <Link className="button button-primary" to="/sample-preview">
            Open full sample
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <DemoPreviewStats result={result} />
      <figure
        className="product-demo-frame"
        aria-label="ShiftWorksHR sample analysis using the live results dashboard"
      >
        <div className="product-demo-frame__scroll">
          <SampleAnalysisEmbed result={result} />
        </div>
      </figure>
    </>
  );
}
