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
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
const webmOut = path.join(marketingDir, "demo-walkthrough.webm");
const mp4Out = path.join(marketingDir, "demo-walkthrough.mp4");
const RECORD_MS = 34_000;
const videoTempDir = path.join(marketingDir, ".record-tmp");

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

async function main() {
  fs.mkdirSync(marketingDir, { recursive: true });
  fs.mkdirSync(videoTempDir, { recursive: true });

  const healthCheck = await fetch(`${baseUrl}/api/health`).catch(() => null);
  if (!healthCheck?.ok) {
    throw new Error(`App not reachable at ${baseUrl}. Start with ./start.sh`);
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
    await page.waitForSelector(".demo-video-layer--active", { timeout: 10_000 });
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

    const ffmpeg = resolveFfmpeg();
    if (ffmpeg) {
      execSync(
        `"${ffmpeg}" -y -i "${webmOut}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${mp4Out}"`,
        { stdio: "inherit", shell: true },
      );
      console.log(`Saved ${mp4Out}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
