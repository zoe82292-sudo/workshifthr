import { useEffect, useState } from "react";
import { fetchDemoAnalysis } from "../api";
import { pickInitialTab } from "../analysisNavigation";
import type { AnalysisResult, AnalysisTab } from "../types";
import { ResultsDashboard } from "./ResultsDashboard";

type DemoVideoDashboardProps = {
  activeTab: AnalysisTab;
  focus: "overview" | "table";
};

export function DemoVideoDashboard({ activeTab, focus }: DemoVideoDashboardProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [tab, setTab] = useState<AnalysisTab>(activeTab);

  useEffect(() => {
    void fetchDemoAnalysis().then((analysis) => {
      setResult(analysis);
      setTab(activeTab || pickInitialTab(analysis));
    });
  }, [activeTab]);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  if (!result) {
    return <div className="demo-video-dashboard demo-video-dashboard--loading">Loading…</div>;
  }

  return (
    <div className="demo-video-dashboard" data-focus={focus}>
      <ResultsDashboard
        result={result}
        activeTab={tab}
        onTabChange={setTab}
        fileName="compensation-export.xlsx"
      />
    </div>
  );
}
