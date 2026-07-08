import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { DemoPdfPreview } from "./DemoPdfPreview";
import { DemoVideoResultsScene } from "./DemoVideoResultsScene";
import { DemoVideoBrowserFrame } from "./DemoVideoBrowserFrame";
import { DEMO_VIDEO_SCENES } from "../demoVideoConfig";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";

function IntroScene() {
  const { summary, insights, review_queue } = getBundledDemoAnalysis();
  const budget = insights.budget_impact;
  return (
    <div className="demo-video-hero demo-video-hero--intro">
      <div className="demo-video-hero__copy">
        <BrandLogo size="hero" layout="lockup" />
        <p className="demo-video-kicker">Merit-cycle compensation QA</p>
        <h1>Catch below-minimum pay and manager inversions before merit week.</h1>
        <p className="demo-video-sub">
          Upload your HRIS export — get a prioritized review queue and leadership PDF in under a
          minute.
        </p>
      </div>
      <div className="demo-video-hero__visual" aria-hidden>
        <DemoVideoBrowserFrame path="shiftworkshr.com/analyze">
          <div className="demo-video-hero__preview">
            <p className="demo-video-hero__preview-label">Cycle readiness</p>
            <strong className="demo-video-hero__preview-value">
              {insights.executive_summary.risk_level.charAt(0).toUpperCase()}
              {insights.executive_summary.risk_level.slice(1)} risk
            </strong>
            <div className="demo-video-hero__preview-grid">
              <div>
                <span>Below minimum</span>
                <strong>{summary.below_minimum}</strong>
              </div>
              <div>
                <span>Mgr inversions</span>
                <strong>{summary.managers_below_reports}</strong>
              </div>
              <div>
                <span>Review queue</span>
                <strong>{review_queue.total_items}</strong>
              </div>
              <div>
                <span>Budget exposure</span>
                <strong>{formatBudget(budget.total_budget_impact)}</strong>
              </div>
            </div>
          </div>
        </DemoVideoBrowserFrame>
      </div>
    </div>
  );
}

function formatBudget(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

function UploadScene() {
  const { summary, detected_columns } = getBundledDemoAnalysis();
  return (
    <div className="demo-video-hero demo-video-hero--upload">
      <div className="demo-video-hero__copy">
        <p className="demo-video-kicker">Step 1 · Upload</p>
        <h2>Drop your compensation export</h2>
        <p className="demo-video-sub">
          Workday, UKG, ADP, or any CSV. Columns map automatically — salary, ranges, merit %,
          manager ID, and demographics.
        </p>
        <div className="demo-video-hero__vendors">
          <span>Workday</span>
          <span>UKG</span>
          <span>ADP</span>
          <span>Excel / CSV</span>
        </div>
      </div>
      <div className="demo-video-hero__visual" aria-hidden>
        <DemoVideoBrowserFrame path="shiftworkshr.com/upload">
          <div className="demo-video-upload__inner">
            <div className="demo-video-upload__icon" aria-hidden>
              <span className="demo-video-upload__doc" />
            </div>
            <p className="demo-video-upload__file">compensation-sample.csv</p>
            <p className="demo-video-upload__meta">
              {summary.valid_rows} employees · {detected_columns.length} columns auto-detected
            </p>
            <div className="demo-video-upload__checks">
              <span>Salary &amp; range</span>
              <span>Merit %</span>
              <span>Gender &amp; race</span>
              <span>Manager ID</span>
            </div>
          </div>
        </DemoVideoBrowserFrame>
      </div>
    </div>
  );
}

function CtaScene() {
  return (
    <div className="demo-video-hero demo-video-hero--cta">
      <div className="demo-video-hero__copy demo-video-hero__copy--center">
        <BrandLogo size="hero" layout="lockup" />
        <h2>Try free with your file</h2>
        <p className="demo-video-sub">No credit card · 250 rows per day · shiftworkshr.com</p>
        <span className="demo-video-cta button button-primary">Upload your export</span>
      </div>
    </div>
  );
}

const SCENES = [
  { id: "intro", layerClass: "demo-video-layer--hero", render: () => <IntroScene /> },
  { id: "upload", layerClass: "demo-video-layer--hero", render: () => <UploadScene /> },
  {
    id: "dashboard",
    layerClass: "demo-video-layer--app",
    render: () => <DemoVideoResultsScene variant="overview" />,
  },
  {
    id: "issues",
    layerClass: "demo-video-layer--app demo-video-layer--app-table",
    render: () => <DemoVideoResultsScene variant="below_minimum" />,
  },
  {
    id: "pdf",
    layerClass: "demo-video-layer--pdf",
    render: () => (
      <DemoVideoBrowserFrame path="shiftworkshr.com/export/summary.pdf">
        <DemoPdfPreview video />
      </DemoVideoBrowserFrame>
    ),
  },
  { id: "cta", layerClass: "demo-video-layer--hero demo-video-layer--hero-cta", render: () => <CtaScene /> },
] as const;

function parseSceneDurations(): number[] {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("durations");
  if (override) {
    const values = override
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === SCENES.length) {
      return values;
    }
  }
  return DEMO_VIDEO_SCENES.map((scene) => scene.durationMs);
}

export function DemoVideoPage() {
  const params = new URLSearchParams(window.location.search);
  const capture = params.get("capture") === "1";
  const autoplay = params.get("autoplay") === "1";
  const showControls = !autoplay && !capture && params.get("controls") === "1";
  const sceneParam = params.get("scene");
  const sceneDurations = useMemo(() => parseSceneDurations(), []);
  const initialScene =
    sceneParam !== null && sceneParam !== ""
      ? Math.min(SCENES.length - 1, Math.max(0, Number(sceneParam)))
      : 0;
  const [scene, setScene] = useState(initialScene);

  useEffect(() => {
    if (!autoplay) return;
    const timers: number[] = [];
    let elapsed = sceneDurations[0] ?? 5000;
    for (let index = 1; index < SCENES.length; index += 1) {
      timers.push(window.setTimeout(() => setScene(index), elapsed));
      elapsed += sceneDurations[index] ?? 5000;
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [autoplay, sceneDurations]);

  const staticScene = capture || (!autoplay && sceneParam !== null && sceneParam !== "");
  const visibleScenes = staticScene
    ? [{ ...SCENES[scene], index: scene }]
    : SCENES.map((item, index) => ({ ...item, index }));

  return (
    <div
      className="demo-video-page"
      data-autoplay={autoplay ? "true" : "false"}
      data-capture={capture ? "true" : "false"}
    >
      <div className="demo-video-stage">
        {visibleScenes.map((item) => (
          <div
            key={item.id}
            className={`demo-video-layer ${item.layerClass}${
              scene === item.index || capture ? " demo-video-layer--active" : ""
            }`}
            aria-hidden={scene !== item.index && !capture}
          >
            {item.render()}
          </div>
        ))}
        {showControls ? (
          <div className="demo-video-controls">
            {SCENES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={scene === index ? "active" : ""}
                onClick={() => setScene(index)}
              >
                {item.id}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
