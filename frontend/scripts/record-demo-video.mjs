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

function polishVoiceWav(ffmpeg, inputPath, outputPath, light = false) {
  const filter = light
    ? "highpass=f=80,alimiter=limit=0.95"
    : "highpass=f=90,acompressor=threshold=-22dB:ratio=2.5:attack=12:release=120,alimiter=limit=0.92";
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

function resolveSayVoice() {
  const preferred = process.env.RECORD_VOICE;
  const candidates = [preferred, "Ava", "Allison", "Daniel", "Samantha"].filter(Boolean);
  if (process.platform !== "darwin") {
    return candidates[candidates.length - 1];
  }
  const listing = spawnSync("say", ["-v", "?"], { encoding: "utf8" });
  const available = `${listing.stdout ?? ""}${listing.stderr ?? ""}`;
  for (const voice of candidates) {
    if (available.includes(voice)) {
      return voice;
    }
  }
  return "Samantha";
}

function synthesizeWithElevenLabs(scene, ffmpeg) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";
  const mp3 = path.join(narrationTempDir, `scene-${scene.id}.mp3`);
  const response = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      "-H",
      `xi-api-key: ${apiKey}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({
        text: scene.narration,
        model_id: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
        voice_settings: { stability: 0.42, similarity_boost: 0.82, style: 0.18, use_speaker_boost: true },
      }),
      "--output",
      mp3,
    ],
    { encoding: "utf8" },
  );

  if (response.status !== 0 || !fs.existsSync(mp3) || fs.statSync(mp3).size < 1000) {
    throw new Error(`ElevenLabs failed for scene "${scene.id}"`);
  }

  const rawWav = path.join(narrationTempDir, `scene-${scene.id}-raw.wav`);
  execSync(
    `${shellQuote(ffmpeg)} -y -i ${shellQuote(mp3)} -ar 44100 -ac 1 ${shellQuote(rawWav)}`,
    { stdio: "ignore" },
  );
  console.log(`  voice: ElevenLabs (${voiceId})`);
  return rawWav;
}

function synthesizeWithEdgeTts(scene, ffmpeg, python) {
  const mp3 = path.join(narrationTempDir, `scene-${scene.id}.mp3`);
  const voice = process.env.RECORD_EDGE_VOICE ?? "en-US-AndrewMultilingualNeural";
  const rate = process.env.RECORD_EDGE_RATE ?? "+5%";
  const pitch = process.env.RECORD_EDGE_PITCH ?? "-1Hz";
  const pauseMs = process.env.RECORD_EDGE_PAUSE_MS ?? "200";
  const script = path.join(repoRoot, "scripts/synthesize_narration.py");
  execSync(
    `${shellQuote(python)} ${shellQuote(script)} ${shellQuote(scene.narration)} ${shellQuote(mp3)} --voice ${voice} --rate ${rate} --pitch ${pitch} --chunk-pause-ms ${pauseMs} --ffmpeg ${shellQuote(ffmpeg)}`,
    { stdio: "inherit" },
  );
  const rawWav = path.join(narrationTempDir, `scene-${scene.id}-raw.wav`);
  execSync(
    `${shellQuote(ffmpeg)} -y -i ${shellQuote(mp3)} -ar 44100 -ac 1 ${shellQuote(rawWav)}`,
    { stdio: "ignore" },
  );
  console.log(`  voice: Edge neural (${voice})`);
  return rawWav;
}

function synthesizeSceneSpeech(scene, ffmpeg, { python, useEdgeTts, sayVoice }) {
  const custom = resolveCustomNarration(scene.id);
  const rawWav = path.join(narrationTempDir, `scene-${scene.id}-raw.wav`);
  const polishedWav = path.join(narrationTempDir, `scene-${scene.id}-polished.wav`);

  if (custom) {
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(custom)} -ar 44100 -ac 1 ${shellQuote(rawWav)}`,
      { stdio: "ignore" },
    );
    console.log(`  voice: custom file (${path.basename(custom)})`);
    polishVoiceWav(ffmpeg, rawWav, polishedWav, false);
    return polishedWav;
  }

  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const elevenWav = synthesizeWithElevenLabs(scene, ffmpeg);
      if (elevenWav) {
        polishVoiceWav(ffmpeg, elevenWav, polishedWav, true);
        return polishedWav;
      }
    } catch (error) {
      console.warn(`  ElevenLabs failed for ${scene.id}, falling back to Edge TTS.`);
    }
  }

  if (useEdgeTts && python) {
    try {
      const edgeWav = synthesizeWithEdgeTts(scene, ffmpeg, python);
      polishVoiceWav(ffmpeg, edgeWav, polishedWav, true);
      return polishedWav;
    } catch (error) {
      console.warn(`  Edge TTS failed for ${scene.id}, falling back to macOS say.`);
    }
  }

  const aiff = path.join(narrationTempDir, `scene-${scene.id}.aiff`);
  const rate = process.env.RECORD_SPEECH_RATE ?? "168";
  execSync(`say -v ${sayVoice} -r ${rate} -o ${shellQuote(aiff)} ${shellQuote(scene.narration)}`);
  convertSpeechToWav(aiff, rawWav, ffmpeg);
  console.log(`  voice: macOS ${sayVoice}`);
  polishVoiceWav(ffmpeg, rawWav, polishedWav, false);
  return polishedWav;
}

function buildNarrationTrack(ffmpeg) {
  if (process.env.RECORD_VOICEOVER === "0") {
    console.log("Skipping voiceover (RECORD_VOICEOVER=0).");
    return { audioPath: null, sceneDurationsMs: scenes.map((scene) => scene.durationMs) };
  }

  fs.mkdirSync(narrationTempDir, { recursive: true });
  const python = resolvePython();
  const hasCustom = scenes.some((scene) => resolveCustomNarration(scene.id));
  const useEdgeTts = !hasCustom && process.env.RECORD_USE_EDGE_TTS !== "0" && Boolean(python);

  if (useEdgeTts) {
    console.log(
      `Narration: Edge neural (${process.env.RECORD_EDGE_VOICE ?? "en-US-AndrewMultilingualNeural"}, chunked)`,
    );
  } else {
    console.log(`Narration: macOS say (${resolveSayVoice()})`);
  }

  const sayVoice = resolveSayVoice();
  const sceneFiles = [];
  const sceneDurationsMs = [];

  for (const scene of scenes) {
    const polishedWav = synthesizeSceneSpeech(scene, ffmpeg, { python, useEdgeTts, sayVoice });
    const speechSeconds = probeDurationSeconds(ffmpeg, polishedWav);
    if (speechSeconds < 0.4) {
      throw new Error(`Voiceover for scene "${scene.id}" is empty or too short.`);
    }

    const visualPadSeconds = 0.55;
    const sceneSeconds = speechSeconds + visualPadSeconds;
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
  return { audioPath: audioOut, sceneDurationsMs };
}

function renderSceneClip(ffmpeg, imagePath, durationSec, outputPath) {
  const vf = "scale=1920:1080:flags=lanczos,format=yuv420p";
  execSync(
    `${shellQuote(ffmpeg)} -y -loop 1 -i ${shellQuote(imagePath)} -vf ${shellQuote(vf)} -t ${durationSec.toFixed(3)} -r ${OUTPUT_FPS} -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -movflags +faststart ${shellQuote(outputPath)}`,
    { stdio: "inherit" },
  );
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
      await sleep(600);

      const screenshotPath = path.join(videoTempDir, `scene-${scene.id}.png`);
      await page.locator(".demo-video-stage").screenshot({ path: screenshotPath, type: "png" });
      console.log(`  captured ${scene.id} → ${path.basename(screenshotPath)} (${sceneDurationsMs[index]}ms)`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

function assembleVideo(ffmpeg, sceneDurationsMs, audioPath) {
  const sceneClips = scenes.map((scene, index) => {
    const imagePath = path.join(videoTempDir, `scene-${scene.id}.png`);
    const clipPath = path.join(videoTempDir, `scene-${scene.id}.mp4`);
    const durationSec = sceneDurationsMs[index] / 1000;
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Missing screenshot for scene "${scene.id}"`);
    }
    console.log(`  rendering ${scene.id} (${durationSec.toFixed(1)}s)`);
    renderSceneClip(ffmpeg, imagePath, durationSec, clipPath);
    return clipPath;
  });

  const concatList = path.join(videoTempDir, "video-concat.txt");
  fs.writeFileSync(
    concatList,
    sceneClips.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"),
  );

  const videoOnlyMp4 = path.join(marketingDir, "demo-walkthrough-video-only.mp4");
  execSync(
    `${shellQuote(ffmpeg)} -y -f concat -safe 0 -i ${shellQuote(concatList)} -c copy ${shellQuote(videoOnlyMp4)}`,
    { stdio: "inherit" },
  );

  if (audioPath && fs.existsSync(audioPath)) {
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(videoOnlyMp4)} -i ${shellQuote(audioPath)} -c:v copy -c:a aac -b:a 192k -shortest -map 0:v:0 -map 1:a:0 ${shellQuote(mp4Out)}`,
      { stdio: "inherit" },
    );
    fs.unlinkSync(videoOnlyMp4);
  } else {
    fs.renameSync(videoOnlyMp4, mp4Out);
  }

  console.log(`Saved ${mp4Out}`);
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
  await captureSceneScreenshots(sceneDurationsMs);

  console.log("Assembling video…");
  assembleVideo(ffmpeg, sceneDurationsMs, audioPath);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
