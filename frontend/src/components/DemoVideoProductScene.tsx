import { useState } from "react";
import type { AnalysisTab } from "../types";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";
import { ResultsDashboard } from "./ResultsDashboard";

type DemoVideoProductSceneProps = {
  activeTab: AnalysisTab;
  /** overview = cycle readiness + stat cards; budget = merit dollars; tab = single tab panel only */
  mode: "overview" | "budget" | "tab";
};

export function DemoVideoProductScene({ activeTab, mode }: DemoVideoProductSceneProps) {
  const [tab, setTab] = useState(activeTab);
  const result = getBundledDemoAnalysis();

  return (
    <div className="demo-video-real-product" data-mode={mode} data-tab={activeTab}>
      <ResultsDashboard
        result={result}
        activeTab={tab}
        onTabChange={setTab}
        fileName="compensation-sample.csv"
        trialMode={false}
      />
    </div>
  );
}
