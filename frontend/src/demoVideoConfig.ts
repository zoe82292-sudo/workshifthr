import scenesConfig from "../demo-video.config.json";

export type DemoVideoSceneConfig = {
  id: string;
  durationMs: number;
  narration: string;
};

export const DEMO_VIDEO_SCENES = scenesConfig.scenes as DemoVideoSceneConfig[];

export const DEMO_VIDEO_TOTAL_MS = DEMO_VIDEO_SCENES.reduce((sum, scene) => sum + scene.durationMs, 0);
