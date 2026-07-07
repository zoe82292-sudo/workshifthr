#!/usr/bin/env node
/**
 * Records a LinkedIn walkthrough to marketing/demo-walkthrough.mp4 (not deployed).
 *
 * Voice (best to worst):
 * 1. Place studio files in marketing/narration/{scene-id}.m4a or .wav
 * 2. macOS say with RECORD_VOICE (default Ava → Allison → Samantha)
 * 3. RECORD_VOICEOVER=0 for silent video
 */
import { chromium } from "playwright";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const marketingDir = path.resolve(__dirname, "../../marketing");
const narrationDir = path.join(marketingDir, "narration");
const configPath = path.resolve(__dirname, "../demo-video.config.json");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
const webmOut = path.join(marketingDir, "demo-walkthrough.webm");
const mp4Out = path.join(marketingDir, "demo-walkthrough.mp4");
const audioOut = path.join(marketingDir, "demo-walkthrough-audio.m4a");
const videoTempDir = path.join(marketingDir, ".record-tmp");
const narrationTempDir = path.join(marketingDir, ".narration-tmp");

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

function polishVoiceWav(ffmpeg, inputPath, outputPath) {
  execSync(
    `${shellQuote(ffmpeg)} -y -i ${shellQuote(inputPath)} -af "highpass=f=90,acompressor=threshold=-22dB:ratio=2.5:attack=12:release=120,alimiter=limit=0.92" ${shellQuote(outputPath)}`,
    { stdio: "ignore" },
  );
}

function convertSpeechToWav(aiffPath, wavPath) {
  if (process.platform === "darwin" && spawnSync("which", ["afconvert"]).status === 0) {
    execSync(
      `afconvert -f WAVE -d LEI16@44100 ${shellQuote(aiffPath)} ${shellQuote(wavPath)}`,
      { stdio: "ignore" },
    );
    return;
  }
  execSync(
    `${shellQuote(resolveFfmpeg())} -y -i ${shellQuote(aiffPath)} -ar 44100 -ac 1 ${shellQuote(wavPath)}`,
    { shell: true, stdio: "ignore" },
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

function synthesizeSceneSpeech(scene, ffmpeg, voice) {
  const custom = resolveCustomNarration(scene.id);
  const rawWav = path.join(narrationTempDir, `scene-${scene.id}-raw.wav`);
  const polishedWav = path.join(narrationTempDir, `scene-${scene.id}-polished.wav`);

  if (custom) {
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(custom)} -ar 44100 -ac 1 ${shellQuote(rawWav)}`,
      { stdio: "ignore" },
    );
    console.log(`  voice: custom file (${path.basename(custom)})`);
  } else {
    const aiff = path.join(narrationTempDir, `scene-${scene.id}.aiff`);
    const rate = process.env.RECORD_SPEECH_RATE ?? "168";
    execSync(`say -v ${voice} -r ${rate} -o ${shellQuote(aiff)} ${shellQuote(scene.narration)}`);
    convertSpeechToWav(aiff, rawWav);
    console.log(`  voice: macOS ${voice}`);
  }

  polishVoiceWav(ffmpeg, rawWav, polishedWav);
  return polishedWav;
}

function buildNarrationTrack(ffmpeg) {
  if (process.env.RECORD_VOICEOVER === "0") {
    console.log("Skipping voiceover (RECORD_VOICEOVER=0).");
    return { audioPath: null, sceneDurationsMs: scenes.map((scene) => scene.durationMs) };
  }

  fs.mkdirSync(narrationTempDir, { recursive: true });
  const voice = resolveSayVoice();
  console.log(`Narration voice: ${voice}`);
  const sceneFiles = [];
  const sceneDurationsMs = [];

  for (const scene of scenes) {
    const polishedWav = synthesizeSceneSpeech(scene, ffmpeg, voice);
    const speechSeconds = probeDurationSeconds(ffmpeg, polishedWav);
    if (speechSeconds < 0.4) {
      throw new Error(`Voiceover for scene "${scene.id}" is empty or too short.`);
    }

    const visualPadSeconds = 0.45;
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
    `${shellQuote(ffmpeg)} -y -f concat -safe 0 -i ${shellQuote(listFile)} -c:a aac -b:a 160k ${shellQuote(audioOut)}`,
    { stdio: "inherit" },
  );

  console.log(`Saved ${audioOut}`);
  return { audioPath: audioOut, sceneDurationsMs };
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
  const recordMs = sceneDurationsMs.reduce((sum, ms) => sum + ms, 0) + 600;
  const durationsQuery = sceneDurationsMs.join(",");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: videoTempDir,
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/demo-video?autoplay=1&durations=${durationsQuery}`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector(".demo-video-layer--active", { timeout: 15_000 });
    await sleep(recordMs);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (!video) {
      throw new Error("Playwright did not produce a video recording.");
    }

    const recordedPath = await video.path();
    if (fs.existsSync(webmOut)) {
      fs.unlinkSync(webmOut);
    }
    fs.renameSync(recordedPath, webmOut);
    console.log(`Saved ${webmOut}`);

    const videoOnlyMp4 = path.join(marketingDir, "demo-walkthrough-video-only.mp4");
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(webmOut)} -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -an ${shellQuote(videoOnlyMp4)}`,
      { shell: true, stdio: "inherit" },
    );

    if (audioPath && fs.existsSync(audioPath)) {
      execSync(
        `${shellQuote(ffmpeg)} -y -i ${shellQuote(videoOnlyMp4)} -i ${shellQuote(audioPath)} -c:v copy -c:a aac -b:a 160k -map 0:v:0 -map 1:a:0 ${shellQuote(mp4Out)}`,
        { shell: true, stdio: "inherit" },
      );
      fs.unlinkSync(videoOnlyMp4);
    } else {
      fs.renameSync(videoOnlyMp4, mp4Out);
    }

    console.log(`Saved ${mp4Out}`);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
