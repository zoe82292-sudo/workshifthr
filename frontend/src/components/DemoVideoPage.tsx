import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { MarketingPreview } from "./MarketingPreview";

const SCENE_MS = [4500, 5000, 6500, 6500, 5500, 4500];

function IntroScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--intro">
      <BrandLogo size="hero" layout="lockup" />
      <p className="demo-video-kicker">Comp spreadsheet QA</p>
      <h1>Find pay issues before leadership review.</h1>
      <p className="demo-video-sub">
        Upload your HRIS export. Range flags, compression checks, and a leadership PDF — in under a
        minute.
      </p>
    </div>
  );
}

function UploadScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--upload">
      <p className="demo-video-kicker">Step 1</p>
      <h2>Upload Excel or CSV</h2>
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

function ExportsScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--exports">
      <p className="demo-video-kicker">Step 3</p>
      <h2>Export for leadership</h2>
      <div className="demo-video-export-grid">
        <article className="demo-video-export panel">
          <strong>PDF summary</strong>
          <p>Exec headline, top issues, budget exposure — ready for the merit deck.</p>
        </article>
        <article className="demo-video-export panel">
          <strong>Excel report</strong>
          <p>Full working file with every flagged row and analysis tab.</p>
        </article>
      </div>
    </div>
  );
}

function CtaScene() {
  return (
    <div className="demo-video-scene-card demo-video-scene-card--cta">
      <BrandLogo size="hero" layout="lockup" />
      <h2>Try free with your file</h2>
      <p className="demo-video-sub">No credit card · 250 rows · shiftworkshr.com</p>
      <span className="demo-video-cta button button-primary">Upload your export</span>
    </div>
  );
}

const SCENES = [
  { id: "intro", render: () => <IntroScene /> },
  { id: "upload", render: () => <UploadScene /> },
  { id: "summary", render: () => <MarketingPreview focus="summary" /> },
  { id: "table", render: () => <MarketingPreview focus="table" /> },
  { id: "exports", render: () => <ExportsScene /> },
  { id: "cta", render: () => <CtaScene /> },
];

export function DemoVideoPage() {
  const params = new URLSearchParams(window.location.search);
  const autoplay = params.get("autoplay") === "1";
  const sceneParam = params.get("scene");
  const initialScene =
    sceneParam !== null && sceneParam !== "" ? Math.min(SCENES.length - 1, Math.max(0, Number(sceneParam))) : 0;
  const [scene, setScene] = useState(initialScene);

  useEffect(() => {
    if (!autoplay) return;
    const timers: number[] = [];
    let elapsed = SCENE_MS[0];
    for (let index = 1; index < SCENES.length; index += 1) {
      timers.push(window.setTimeout(() => setScene(index), elapsed));
      elapsed += SCENE_MS[index];
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [autoplay]);

  const staticScene = !autoplay && sceneParam !== null && sceneParam !== "";
  const visibleScenes = staticScene ? [{ ...SCENES[scene], index: scene }] : SCENES.map((item, index) => ({ ...item, index }));

  return (
    <div className="demo-video-page" data-autoplay={autoplay ? "true" : "false"}>
      <div className="demo-video-stage">
        {visibleScenes.map((item) => (
          <div
            key={item.id}
            className={`demo-video-layer${scene === item.index ? " demo-video-layer--active" : ""}`}
            aria-hidden={scene !== item.index}
          >
            {item.render()}
          </div>
        ))}
      </div>
      {!autoplay ? (
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
  );
}
