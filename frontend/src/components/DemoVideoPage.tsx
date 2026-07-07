import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { DemoPdfPreview } from "./DemoPdfPreview";
import { DemoVideoDashboard } from "./DemoVideoDashboard";
import { DEMO_VIDEO_SCENES } from "../demoVideoConfig";

function IntroScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--intro">
      <BrandLogo size="hero" layout="lockup" />
      <p className="demo-video-kicker">Merit-cycle comp QA</p>
      <h1>Catch below-minimum pay and manager inversions before merit week.</h1>
      <p className="demo-video-sub">
        Upload your HRIS export — prioritized review queue and leadership PDF in under a minute.
      </p>
    </div>
  );
}

function UploadScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--upload">
      <p className="demo-video-kicker">Step 1 · Upload</p>
      <h2>Drop your HRIS export</h2>
      <div className="demo-video-upload panel">
        <div className="demo-video-upload__icon" aria-hidden>
          📄
        </div>
        <p className="demo-video-upload__file">compensation-export.xlsx</p>
        <p className="demo-video-upload__meta">18 employees · columns auto-detected</p>
        <div className="demo-video-upload__checks">
          <span>Range min / max</span>
          <span>Merit %</span>
          <span>Department &amp; level</span>
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
      <p className="demo-video-sub">No credit card · 250 rows/day · shiftworkshr.com</p>
      <span className="demo-video-cta button button-primary">Upload your export</span>
    </div>
  );
}

const SCENES = [
  { id: "intro", layerClass: "demo-video-layer--card", render: () => <IntroScene /> },
  { id: "upload", layerClass: "demo-video-layer--card", render: () => <UploadScene /> },
  {
    id: "dashboard",
    layerClass: "demo-video-layer--app",
    render: () => <DemoVideoDashboard focus="overview" />,
  },
  {
    id: "issues",
    layerClass: "demo-video-layer--app",
    render: () => <DemoVideoDashboard focus="table" />,
  },
  { id: "pdf", layerClass: "demo-video-layer--pdf", render: () => <DemoPdfPreview /> },
  { id: "cta", layerClass: "demo-video-layer--card", render: () => <CtaScene /> },
] as const;

export function DemoVideoPage() {
  const params = new URLSearchParams(window.location.search);
  const autoplay = params.get("autoplay") === "1";
  const showControls = !autoplay && params.get("controls") === "1";
  const sceneParam = params.get("scene");
  const initialScene =
    sceneParam !== null && sceneParam !== ""
      ? Math.min(SCENES.length - 1, Math.max(0, Number(sceneParam)))
      : 0;
  const [scene, setScene] = useState(initialScene);

  useEffect(() => {
    if (!autoplay) return;
    const timers: number[] = [];
    let elapsed = DEMO_VIDEO_SCENES[0]?.durationMs ?? 5000;
    for (let index = 1; index < SCENES.length; index += 1) {
      timers.push(window.setTimeout(() => setScene(index), elapsed));
      elapsed += DEMO_VIDEO_SCENES[index]?.durationMs ?? 5000;
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [autoplay]);

  const staticScene = !autoplay && sceneParam !== null && sceneParam !== "";
  const visibleScenes = staticScene
    ? [{ ...SCENES[scene], index: scene }]
    : SCENES.map((item, index) => ({ ...item, index }));

  return (
    <div className="demo-video-page" data-autoplay={autoplay ? "true" : "false"}>
      <div className="demo-video-stage">
        {visibleScenes.map((item) => (
          <div
            key={item.id}
            className={`demo-video-layer ${item.layerClass}${
              scene === item.index ? " demo-video-layer--active" : ""
            }`}
            aria-hidden={scene !== item.index}
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
