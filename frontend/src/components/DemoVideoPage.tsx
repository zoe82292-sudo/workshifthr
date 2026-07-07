import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { DemoPdfPreview } from "./DemoPdfPreview";
import { MarketingPreview } from "./MarketingPreview";
import { DEMO_VIDEO_SCENES } from "../demoVideoConfig";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";

function IntroScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--intro">
      <BrandLogo size="hero" layout="lockup" />
      <p className="demo-video-kicker">Merit-cycle compensation QA</p>
      <h1>Catch below-minimum pay and manager inversions before merit week.</h1>
      <p className="demo-video-sub">
        Upload your HRIS export — get a prioritized review queue and leadership PDF in under a
        minute.
      </p>
    </div>
  );
}

function UploadScene() {
  const { summary, detected_columns } = getBundledDemoAnalysis();
  return (
    <div className="demo-video-scene-card demo-video-scene-card--upload">
      <p className="demo-video-kicker">Step 1 · Upload</p>
      <h2>Drop your compensation export</h2>
      <div className="demo-video-upload panel">
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
    </div>
  );
}

function CtaScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--cta">
      <BrandLogo size="hero" layout="lockup" />
      <h2>Try free with your file</h2>
      <p className="demo-video-sub">No credit card · 250 rows per day · shiftworkshr.com</p>
      <span className="demo-video-cta button button-primary">Upload your export</span>
    </div>
  );
}

function ProductScene({ focus }: { focus: "summary" | "table" }) {
  const { summary } = getBundledDemoAnalysis();
  return (
    <div className="demo-video-product">
      <header className="demo-video-product__bar">
        <div>
          <p className="demo-video-product__file">compensation-sample.csv</p>
          <p className="demo-video-product__status">
            Analysis complete · {summary.valid_rows} employees
          </p>
        </div>
        <div className="demo-video-product__exports" aria-hidden>
          <span>PDF summary</span>
          <span className="demo-video-product__exports--primary">Excel report</span>
        </div>
      </header>
      {focus === "table" ? (
        <nav className="demo-video-product__tabs" aria-hidden>
          <span>Overview</span>
          <span className="is-active">Below minimum</span>
          <span>Compression</span>
          <span>Manager pay</span>
          <span>Pay equity</span>
        </nav>
      ) : null}
      <MarketingPreview
        focus={focus}
        className="demo-video-marketing-preview demo-video-marketing-preview--video"
      />
    </div>
  );
}

const SCENES = [
  { id: "intro", layerClass: "demo-video-layer--card", render: () => <IntroScene /> },
  { id: "upload", layerClass: "demo-video-layer--card", render: () => <UploadScene /> },
  {
    id: "dashboard",
    layerClass: "demo-video-layer--app",
    render: () => <ProductScene focus="summary" />,
  },
  {
    id: "issues",
    layerClass: "demo-video-layer--app demo-video-layer--app-table",
    render: () => <ProductScene focus="table" />,
  },
  { id: "pdf", layerClass: "demo-video-layer--pdf", render: () => <DemoPdfPreview /> },
  { id: "cta", layerClass: "demo-video-layer--card", render: () => <CtaScene /> },
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
