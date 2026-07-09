import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { DemoPdfPreview } from "./DemoPdfPreview";
import { DemoVideoProductScene } from "./DemoVideoProductScene";
import { DemoVideoBrowserFrame } from "./DemoVideoBrowserFrame";
import { DEMO_VIDEO_SCENES } from "../demoVideoConfig";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";

function IntroScene() {
  return (
    <div className="demo-video-hero demo-video-hero--intro">
      <div className="demo-video-hero__copy">
        <BrandLogo size="hero" layout="lockup" />
        <p className="demo-video-kicker">For comp teams · under a minute</p>
        <h1>See who's underpaid, what it'll cost to fix, and what leadership needs to know — before merit week.</h1>
        <p className="demo-video-sub">
          One roster upload — review queue, dollar gaps, pay equity, and a leadership PDF. No API required.
        </p>
      </div>
      <div className="demo-video-hero__visual demo-video-hero__visual--product" aria-hidden>
        <DemoVideoBrowserFrame path="shiftworkshr.com/results">
          <div className="demo-video-intro-product">
            <DemoVideoProductScene activeTab="review_queue" mode="overview" />
          </div>
        </DemoVideoBrowserFrame>
      </div>
    </div>
  );
}


function UploadScene() {
  const { summary, detected_columns } = getBundledDemoAnalysis();
  return (
    <div className="demo-video-hero demo-video-hero--upload">
      <div className="demo-video-hero__copy">
        <p className="demo-video-kicker">Step 1 · Upload</p>
        <h2>Drop your roster file</h2>
        <p className="demo-video-sub">
          Pull from Workday, ADP, UKG — or any spreadsheet. No new HRIS, no API — columns map automatically.
        </p>
        <div className="demo-video-hero__vendors">
          <span>Workday</span>
          <span>UKG</span>
          <span>ADP</span>
          <span>Excel / CSV</span>
        </div>
      </div>
      <div className="demo-video-hero__visual demo-video-hero__visual--upload" aria-hidden>
        <DemoVideoBrowserFrame path="shiftworkshr.com/upload">
          <div className="demo-video-upload__inner">
            <div className="demo-video-upload__dropzone">
              <div className="demo-video-upload__icon" aria-hidden>
                <span className="demo-video-upload__doc" />
              </div>
              <p className="demo-video-upload__hint">Drop your file here</p>
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
    render: () => <DemoVideoProductScene activeTab="review_queue" mode="overview" />,
  },
  {
    id: "budget",
    layerClass: "demo-video-layer--app",
    render: () => <DemoVideoProductScene activeTab="review_queue" mode="budget" />,
  },
  {
    id: "issues",
    layerClass: "demo-video-layer--app demo-video-layer--app-table",
    render: () => <DemoVideoProductScene activeTab="below_minimum" mode="tab" />,
  },
  {
    id: "managers",
    layerClass: "demo-video-layer--app demo-video-layer--app-table",
    render: () => <DemoVideoProductScene activeTab="managers_below_reports" mode="tab" />,
  },
  {
    id: "equity",
    layerClass: "demo-video-layer--app demo-video-layer--app-table",
    render: () => <DemoVideoProductScene activeTab="pay_equity" mode="tab" />,
  },
  {
    id: "location",
    layerClass: "demo-video-layer--app demo-video-layer--app-table",
    render: () => <DemoVideoProductScene activeTab="location_pay" mode="tab" />,
  },
  {
    id: "pdf",
    layerClass: "demo-video-layer--pdf demo-video-layer--pdf-full",
    render: () => <DemoPdfPreview video />,
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
