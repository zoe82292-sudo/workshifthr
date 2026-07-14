#!/usr/bin/env node
/**
 * Records a LinkedIn walkthrough to marketing/demo-walkthrough.mp4 (not deployed).
 *
 * Pipeline: high-res per-scene screenshots + neural TTS + ffmpeg assembly.
 *
 * Voice (best to worst):
 * 1. Place studio files in marketing/narration/{scene-id}.m4a or .wav
 * 2. Microsoft Edge neural TTS (Jenny / Aria) via scripts/synthesize_narration.py
 * 3. macOS say with RECORD_VOICE
 * 4. RECORD_VOICEOVER=0 for silent video
 */
import { chromium } from "playwright";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const marketingDir = path.join(repoRoot, "marketing");
const narrationDir = path.join(marketingDir, "narration");
const configPath = path.resolve(__dirname, "../demo-video.config.json");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
const mp4Out = path.join(marketingDir, "demo-walkthrough.mp4");
const audioOut = path.join(marketingDir, "demo-walkthrough-audio.m4a");
const videoTempDir = path.join(marketingDir, ".record-tmp");
const narrationTempDir = path.join(marketingDir, ".narration-tmp");

const VIEWPORT = { width: 1920, height: 1080 };
const OUTPUT_FPS = 30;

const { scenes } = JSON.parse(fs.readFileSync(configPath, "utf8"));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveFfmpeg() {
  if (ffmpegInstaller?.path && fs.existsSync(ffmpegInstaller.path)) {
    return ffmpegInstaller.path;
  }
  if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0) {
    return "ffmpeg";
  }
  return null;
}

function resolvePython() {
  const candidates = [
    path.join(repoRoot, "backend/.venv/bin/python"),
    path.join(repoRoot, "backend/.venv/bin/python3"),
    "python3",
    "python",
  ];
  for (const candidate of candidates) {
    if (candidate.includes("/") && fs.existsSync(candidate)) {
      return candidate;
    }
    if (!candidate.includes("/") && spawnSync("which", [candidate]).status === 0) {
      return candidate;
    }
  }
  return null;
}

function shellQuote(value) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function probeDurationSeconds(ffmpeg, filePath) {
  const result = spawnSync(ffmpeg, ["-i", filePath, "-f", "null", "-"], { encoding: "utf8" });
  const output = `${result.stderr ?? ""}`;
  const match = output.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function polishVoiceWav(ffmpeg, inputPath, outputPath, light = true) {
  if (process.env.RECORD_VOICE_POLISH === "0" || light) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }
  const filter =
    "highpass=f=90,acompressor=threshold=-22dB:ratio=2.5:attack=12:release=120,alimiter=limit=0.92";
  execSync(
    `${shellQuote(ffmpeg)} -y -i ${shellQuote(inputPath)} -af ${shellQuote(filter)} ${shellQuote(outputPath)}`,
    { stdio: "ignore" },
  );
}

function convertSpeechToWav(aiffPath, wavPath, ffmpeg) {
  if (process.platform === "darwin" && spawnSync("which", ["afconvert"]).status === 0) {
    execSync(
      `afconvert -f WAVE -d LEI16@44100 ${shellQuote(aiffPath)} ${shellQuote(wavPath)}`,
      { stdio: "ignore" },
    );
    return;
  }
  execSync(
    `${shellQuote(ffmpeg)} -y -i ${shellQuote(aiffPath)} -ar 44100 -ac 1 ${shellQuote(wavPath)}`,
    { stdio: "ignore" },
  );
}

function resolveCustomNarration(sceneId) {
  for (const ext of [".m4a", ".wav", ".mp3", ".aac"]) {
    const candidate = path.join(narrationDir, `${sceneId}${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveFullTakeNarration() {
  const preferred = [
    process.env.RECORD_FULL_TAKE,
    "full-take-idid.m4a",
    "full-take-1000.m4a",
    "full-take-yay.m4a",
    "full-take-perfect-zoe.m4a",
    "full-take-final-zoe.m4a",
    "full-take-zoe.m4a",
    "full-take.m4a",
    "full-take.wav",
    "full-take.mp3",
  ].filter(Boolean);

  for (const name of preferred) {
    const candidate = path.isAbsolute(name) ? name : path.join(narrationDir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadFullTakeSceneDurationsMs(fullTakePath, ffmpeg) {
  const timingsPath = path.join(narrationDir, "scene-timings.json");
  const totalSec = probeDurationSeconds(ffmpeg, fullTakePath);
  if (!fs.existsSync(timingsPath)) {
    const each = totalSec / scenes.length;
    return scenes.map(() => Math.ceil(each * 1000));
  }

  const timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
  const cuts = Array.isArray(timings.cutsSec) ? [...timings.cutsSec] : null;
  if (!cuts || cuts.length < 2) {
    throw new Error("narration/scene-timings.json must include cutsSec array");
  }
  if (cuts[cuts.length - 1] == null) {
    cuts[cuts.length - 1] = totalSec;
  }
  if (cuts.length !== scenes.length + 1) {
    throw new Error(
      `scene-timings.json cutsSec length must be ${scenes.length + 1} (got ${cuts.length})`,
    );
  }

  return scenes.map((_, index) => {
    const startSec = Number(cuts[index]);
    const endSec = Number(cuts[index + 1]);
    const seconds = Math.max(0.4, endSec - startSec);
    return Math.ceil(seconds * 1000);
  });
}

function buildNarrationTrack(ffmpeg) {
  if (process.env.RECORD_VOICEOVER === "0") {
    console.log("Skipping voiceover (RECORD_VOICEOVER=0).");
    return { audioPath: null, sceneDurationsMs: scenes.map((scene) => scene.durationMs), sceneSpeechSeconds: [] };
  }

  fs.mkdirSync(narrationTempDir, { recursive: true });

  // Prefer one continuous take — avoids choppy voice edits between scenes.
  const fullTake = resolveFullTakeNarration();
  if (fullTake && process.env.RECORD_SPLIT_VOICE !== "1") {
    const sceneDurationsMs = loadFullTakeSceneDurationsMs(fullTake, ffmpeg);
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(fullTake)} -ar 44100 -ac 1 -c:a aac -b:a 192k ${shellQuote(audioOut)}`,
      { stdio: "inherit" },
    );
    const totalSpeech = probeDurationSeconds(ffmpeg, audioOut);
    console.log(
      `Narration: continuous take (${path.basename(fullTake)}, ${totalSpeech.toFixed(1)}s) — no voice cuts`,
    );
    scenes.forEach((scene, index) => {
      console.log(`  ${scene.id}: ${(sceneDurationsMs[index] / 1000).toFixed(1)}s visual`);
    });
    return {
      audioPath: audioOut,
      sceneDurationsMs,
      sceneSpeechSeconds: sceneDurationsMs.map((ms) => ms / 1000),
    };
  }

  const python = resolvePython();
  const hasCustom = scenes.some((scene) => resolveCustomNarration(scene.id));
  const useEdgeTts = !hasCustom && process.env.RECORD_USE_EDGE_TTS !== "0" && Boolean(python);

  if (useEdgeTts) {
    console.log(
      `Narration: Edge neural (${process.env.RECORD_EDGE_VOICE ?? "en-US-AndrewMultilingualNeural"}, ${process.env.RECORD_EDGE_RATE ?? "+4%"}, single-pass)`,
    );
  } else {
    console.log(`Narration: macOS say (${resolveSayVoice()}, natural)`);
  }

  const sayVoice = resolveSayVoice();
  const sceneFiles = [];
  const sceneDurationsMs = [];
  const sceneSpeechSeconds = [];

  for (const scene of scenes) {
    const polishedWav = synthesizeSceneSpeech(scene, ffmpeg, { python, useEdgeTts, sayVoice });
    const speechSeconds = probeDurationSeconds(ffmpeg, polishedWav);
    if (speechSeconds < 0.4) {
      throw new Error(`Voiceover for scene "${scene.id}" is empty or too short.`);
    }

    const visualPadSeconds = Number(process.env.RECORD_SCENE_PAD_SEC ?? "0.55");
    const sceneSeconds = speechSeconds + visualPadSeconds;
    sceneSpeechSeconds.push(speechSeconds);
    sceneDurationsMs.push(Math.ceil(sceneSeconds * 1000));

    const padded = path.join(narrationTempDir, `scene-${scene.id}-padded.wav`);
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(polishedWav)} -f lavfi -i anullsrc=r=44100:cl=mono -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" -map "[out]" -t ${sceneSeconds.toFixed(3)} ${shellQuote(padded)}`,
      { stdio: "ignore" },
    );
    sceneFiles.push(padded);
    console.log(`  ${scene.id}: ${speechSeconds.toFixed(1)}s speech → ${sceneSeconds.toFixed(1)}s scene`);
  }

  const listFile = path.join(narrationTempDir, "concat.txt");
  fs.writeFileSync(
    listFile,
    sceneFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"),
  );

  execSync(
    `${shellQuote(ffmpeg)} -y -f concat -safe 0 -i ${shellQuote(listFile)} -c:a aac -b:a 192k ${shellQuote(audioOut)}`,
    { stdio: "inherit" },
  );

  console.log(`Saved ${audioOut}`);
  return { audioPath: audioOut, sceneDurationsMs, sceneSpeechSeconds };
}

function renderSceneClip(ffmpeg, imagePath, durationSec, outputPath) {
  // Stable still — crossfades are applied when assembling scenes together.
  const vf = `scale=1920:1080:flags=lanczos,fps=${OUTPUT_FPS},format=yuv420p`;
  execSync(
    `${shellQuote(ffmpeg)} -y -loop 1 -i ${shellQuote(imagePath)} -vf ${shellQuote(vf)} -t ${durationSec.toFixed(3)} -r ${OUTPUT_FPS} -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p -movflags +faststart ${shellQuote(outputPath)}`,
    { stdio: "inherit" },
  );
}

function buildCrossfadeFilter(sceneCount, durationsSec, crossfadeSec) {
  if (sceneCount < 2) {
    return { filter: "[0:v]null[vout]" };
  }
  const filters = [];
  let current = "0:v";
  for (let i = 1; i < sceneCount; i += 1) {
    const offset = durationsSec.slice(0, i).reduce((sum, value) => sum + value, 0);
    const next = i === sceneCount - 1 ? "vout" : `v${i}`;
    filters.push(
      `[${current}][${i}:v]xfade=transition=fade:duration=${crossfadeSec.toFixed(3)}:offset=${offset.toFixed(3)}[${next}]`,
    );
    current = next;
  }
  return { filter: filters.join(";") };
}

async function captureSceneScreenshots(sceneDurationsMs) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[index];
      const url = `${baseUrl}/demo-video?scene=${index}&capture=1`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector(".demo-video-stage", { timeout: 15_000 });
      await page.waitForFunction(
        () => document.fonts?.ready?.then(() => true) ?? true,
        undefined,
        { timeout: 10_000 },
      );
      if (scene.id === "pdf") {
        await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 30_000 });
        await sleep(500);
      } else {
        await sleep(600);
      }

      const screenshotPath = path.join(videoTempDir, `scene-${scene.id}.png`);
      await page.locator(".demo-video-stage").screenshot({ path: screenshotPath, type: "png" });
      console.log(`  captured ${scene.id} → ${path.basename(screenshotPath)} (${sceneDurationsMs[index]}ms)`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

function formatSrtTimestamp(ms) {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function wrapCaptionCues(text, maxLineLen = 42) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLen) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const cues = [];
  for (let i = 0; i < lines.length; i += 2) {
    cues.push(lines.slice(i, i + 2).join("\n"));
  }
  return cues;
}

function writeCaptionsSrt(sceneDurationsMs, outPath) {
  let cursorMs = 0;
  const entries = [];

  scenes.forEach((scene, index) => {
    const durationMs = sceneDurationsMs[index] ?? scene.durationMs;
    const cues = wrapCaptionCues(scene.narration);
    const sliceMs = Math.floor(durationMs / cues.length);
    cues.forEach((cue, cueIndex) => {
      const startMs = cursorMs + cueIndex * sliceMs;
      const endMs =
        cueIndex === cues.length - 1 ? cursorMs + durationMs - 40 : cursorMs + (cueIndex + 1) * sliceMs - 40;
      entries.push({
        startMs,
        endMs: Math.max(startMs + 400, endMs),
        text: cue,
      });
    });
    cursorMs += durationMs;
  });

  const body = entries
    .map((entry, index) =>
      [
        String(index + 1),
        `${formatSrtTimestamp(entry.startMs)} --> ${formatSrtTimestamp(entry.endMs)}`,
        entry.text,
        "",
      ].join("\n"),
    )
    .join("\n");

  fs.writeFileSync(outPath, body, "utf8");
}

function burnCaptions(ffmpeg, inputPath, srtPath, outputPath) {
  const style = [
    "Fontname=Arial",
    "Fontsize=24",
    "Bold=1",
    "PrimaryColour=&H00FFFFFF",
    "OutlineColour=&H00000000",
    "Outline=2",
    "Shadow=0",
    "Alignment=2",
    "MarginV=52",
  ].join(",");
  const subtitlePath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
  execSync(
    `${shellQuote(ffmpeg)} -y -i ${shellQuote(inputPath)} -vf ${shellQuote(`subtitles='${subtitlePath}':force_style='${style}'`)} -c:a copy -movflags +faststart ${shellQuote(outputPath)}`,
    { stdio: "inherit" },
  );
}


function assembleVideo(ffmpeg, sceneDurationsMs, audioPath) {
  const crossfadeSec = Number(process.env.RECORD_CROSSFADE_SEC ?? "0.65");
  const durationsSec = sceneDurationsMs.map((ms) => ms / 1000);

  const sceneClips = scenes.map((scene, index) => {
    const imagePath = path.join(videoTempDir, `scene-${scene.id}.png`);
    const clipPath = path.join(videoTempDir, `scene-${scene.id}.mp4`);
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Missing screenshot for scene "${scene.id}"`);
    }
    // Extend all but the last clip by the crossfade window so final length still matches audio.
    const isLast = index === scenes.length - 1;
    const renderDur = isLast ? durationsSec[index] : durationsSec[index] + crossfadeSec;
    console.log(
      `  rendering ${scene.id} (${durationsSec[index].toFixed(1)}s` +
        `${isLast ? "" : ` + ${crossfadeSec.toFixed(2)}s crossfade pad`})`,
    );
    renderSceneClip(ffmpeg, imagePath, renderDur, clipPath);
    return clipPath;
  });

  const videoOnlyMp4 = path.join(marketingDir, "demo-walkthrough-video-only.mp4");
  if (sceneClips.length === 1) {
    fs.copyFileSync(sceneClips[0], videoOnlyMp4);
  } else {
    const { filter } = buildCrossfadeFilter(sceneClips.length, durationsSec, crossfadeSec);
    const inputArgs = sceneClips.map((clip) => `-i ${shellQuote(clip)}`).join(" ");
    console.log(`  crossfading ${sceneClips.length} scenes (${crossfadeSec}s dissolves)…`);
    execSync(
      `${shellQuote(ffmpeg)} -y ${inputArgs} -filter_complex ${shellQuote(filter)} -map "[vout]" -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p -movflags +faststart -an ${shellQuote(videoOnlyMp4)}`,
      { stdio: "inherit" },
    );
  }

  if (audioPath && fs.existsSync(audioPath)) {
    const muxedMp4 = path.join(marketingDir, "demo-walkthrough-muxed.mp4");
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(videoOnlyMp4)} -i ${shellQuote(audioPath)} -c:v copy -c:a aac -b:a 192k -ar 44100 -ac 1 -map 0:v:0 -map 1:a:0 -shortest -movflags +faststart ${shellQuote(muxedMp4)}`,
      { stdio: "inherit" },
    );
    fs.unlinkSync(videoOnlyMp4);

    if (process.env.RECORD_CAPTIONS === "1") {
      const srtPath = path.join(videoTempDir, "captions.srt");
      const captionedMp4 = path.join(marketingDir, "demo-walkthrough-captioned.mp4");
      const marketingSrt = path.join(marketingDir, "demo-walkthrough-captions.srt");
      writeCaptionsSrt(sceneDurationsMs, srtPath);
      fs.copyFileSync(srtPath, marketingSrt);
      console.log("Burning captions for LinkedIn…");
      burnCaptions(ffmpeg, muxedMp4, srtPath, captionedMp4);
      fs.renameSync(captionedMp4, mp4Out);
      fs.unlinkSync(muxedMp4);
    } else {
      fs.renameSync(muxedMp4, mp4Out);
    }
  } else {
    fs.renameSync(videoOnlyMp4, mp4Out);
  }

  validateOutput(ffmpeg, mp4Out, audioPath);
  console.log(`Saved ${mp4Out}`);
}

function validateOutput(ffmpeg, mp4Path, audioPath) {
  const videoSeconds = probeDurationSeconds(ffmpeg, mp4Path);
  if (videoSeconds < 20) {
    throw new Error(`Output video is too short (${videoSeconds.toFixed(1)}s).`);
  }

  if (audioPath) {
    const result = spawnSync(
      ffmpeg,
      ["-i", mp4Path, "-af", "volumedetect", "-f", "null", "-"],
      { encoding: "utf8" },
    );
    const output = `${result.stderr ?? ""}`;
    const meanMatch = output.match(/mean_volume: ([-\d.]+) dB/);
    const meanDb = meanMatch ? Number(meanMatch[1]) : -100;
    if (meanDb < -45) {
      throw new Error(`Output audio is too quiet (${meanDb} dB).`);
    }
  }
}

async function main() {
  fs.mkdirSync(marketingDir, { recursive: true });
  fs.mkdirSync(videoTempDir, { recursive: true });

  const healthCheck = await fetch(`${baseUrl}/api/health`).catch(() => null);
  if (!healthCheck?.ok) {
    throw new Error(`App not reachable at ${baseUrl}. Start with ./scripts/start-production.sh`);
  }

  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg) {
    throw new Error("ffmpeg not found. Install ffmpeg or @ffmpeg-installer/ffmpeg.");
  }

  const { audioPath, sceneDurationsMs } = buildNarrationTrack(ffmpeg);

  console.log("Capturing scene screenshots (1920×1080)…");
  if (process.env.RECORD_SKIP_CAPTURE === "1") {
    const missing = scenes.filter((scene) => !fs.existsSync(path.join(videoTempDir, `scene-${scene.id}.png`)));
    if (missing.length) {
      throw new Error(`RECORD_SKIP_CAPTURE=1 but missing screenshots: ${missing.map((s) => s.id).join(", ")}`);
    }
    console.log("  skipped capture (reusing existing scene PNGs)");
  } else {
    await captureSceneScreenshots(sceneDurationsMs);
  }

  console.log("Assembling video…");
  assembleVideo(ffmpeg, sceneDurationsMs, audioPath);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
