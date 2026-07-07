#!/usr/bin/env node
/**
 * Records a LinkedIn walkthrough to marketing/demo-walkthrough.mp4 (not deployed).
 * Requires app at PLAYWRIGHT_BASE_URL and /demo-video route.
 */
import { chromium } from "playwright";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const marketingDir = path.resolve(__dirname, "../../marketing");
const configPath = path.resolve(__dirname, "../demo-video.config.json");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
const webmOut = path.join(marketingDir, "demo-walkthrough.webm");
const mp4Out = path.join(marketingDir, "demo-walkthrough.mp4");
const audioOut = path.join(marketingDir, "demo-walkthrough-audio.m4a");
const videoTempDir = path.join(marketingDir, ".record-tmp");
const narrationTempDir = path.join(marketingDir, ".narration-tmp");

const { scenes } = JSON.parse(fs.readFileSync(configPath, "utf8"));
const RECORD_MS = scenes.reduce((sum, scene) => sum + scene.durationMs, 0) + 800;

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
  const match = `${result.stderr ?? ""}`.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function generateNarrationTrack(ffmpeg) {
  if (process.env.RECORD_VOICEOVER === "0") {
    console.log("Skipping voiceover (RECORD_VOICEOVER=0).");
    return null;
  }
  if (process.platform !== "darwin" || spawnSync("which", ["say"]).status !== 0) {
    console.log("Skipping voiceover (macOS `say` not available).");
    return null;
  }

  fs.mkdirSync(narrationTempDir, { recursive: true });
  const sceneFiles = [];

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const aiff = path.join(narrationTempDir, `scene-${index}.aiff`);
    const padded = path.join(narrationTempDir, `scene-${index}-padded.wav`);

    execSync(`say -v Samantha -r 178 -o ${shellQuote(aiff)} ${shellQuote(scene.narration)}`);
    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(aiff)} -ar 44100 -ac 1 ${shellQuote(padded.replace(".wav", "-raw.wav"))}`,
      { shell: true, stdio: "ignore" },
    );
    const wav = padded.replace(".wav", "-raw.wav");
    const speechSeconds = probeDurationSeconds(ffmpeg, wav);
    const targetSeconds = scene.durationMs / 1000;
    const padSeconds = Math.max(0.2, targetSeconds - speechSeconds - 0.15);

    execSync(
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(wav)} -f lavfi -i anullsrc=r=44100:cl=mono -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" -map "[out]" -t ${(speechSeconds + padSeconds).toFixed(3)} ${shellQuote(padded)}`,
      { shell: true, stdio: "ignore" },
    );
    sceneFiles.push(padded);
  }

  const listFile = path.join(narrationTempDir, "concat.txt");
  fs.writeFileSync(
    listFile,
    sceneFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"),
  );

  execSync(
    `${shellQuote(ffmpeg)} -y -f concat -safe 0 -i ${shellQuote(listFile)} -c:a aac -b:a 128k ${shellQuote(audioOut)}`,
    { shell: true, stdio: "inherit" },
  );

  console.log(`Saved ${audioOut}`);
  return audioOut;
}

async function main() {
  fs.mkdirSync(marketingDir, { recursive: true });
  fs.mkdirSync(videoTempDir, { recursive: true });

  const healthCheck = await fetch(`${baseUrl}/api/health`).catch(() => null);
  if (!healthCheck?.ok) {
    throw new Error(`App not reachable at ${baseUrl}. Start with ./start.sh`);
  }

  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg) {
    throw new Error("ffmpeg not found. Install ffmpeg or @ffmpeg-installer/ffmpeg.");
  }

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
    await page.goto(`${baseUrl}/demo-video?autoplay=1`, { waitUntil: "networkidle" });
    await page.waitForSelector(".demo-video-layer--active", { timeout: 15_000 });
    await sleep(RECORD_MS);
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
      `${shellQuote(ffmpeg)} -y -i ${shellQuote(webmOut)} -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an ${shellQuote(videoOnlyMp4)}`,
      { shell: true, stdio: "inherit" },
    );

    const narration = generateNarrationTrack(ffmpeg);
    if (narration && fs.existsSync(narration)) {
      execSync(
        `${shellQuote(ffmpeg)} -y -i ${shellQuote(videoOnlyMp4)} -i ${shellQuote(narration)} -c:v copy -c:a aac -b:a 128k -shortest ${shellQuote(mp4Out)}`,
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
