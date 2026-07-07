#!/usr/bin/env node
/**
 * Records a ~45s product walkthrough for marketing (Sample tab + LinkedIn DMs).
 *
 * Prerequisites:
 *   App running at PLAYWRIGHT_BASE_URL (default http://127.0.0.1:8080)
 *   Optional: ffmpeg on PATH for MP4 output
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 node scripts/record-demo-video.mjs
 */
import { chromium } from "playwright";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
const webmOut = path.join(publicDir, "demo-walkthrough.webm");
const mp4Out = path.join(publicDir, "demo-walkthrough.mp4");

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

async function waitForApp(page) {
  const health = await page.request.get(`${baseUrl}/api/health`).catch(() => null);
  if (!health?.ok()) {
    throw new Error(
      `App not reachable at ${baseUrl}. Start with ./start.sh or set PLAYWRIGHT_BASE_URL.`,
    );
  }
}

async function main() {
  fs.mkdirSync(publicDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: publicDir,
      size: { width: 1280, height: 800 },
    },
  });
  const page = await context.newPage();

  try {
    await waitForApp(page);

    // Full sample preview — main demo surface (works with or without auth landing page)
    await page.goto(`${baseUrl}/sample-preview`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /analysis results|complete analyzer view/i }).first().waitFor({
      timeout: 20_000,
    });
    await sleep(3000);

    const tabsToVisit = [/review queue/i, /below minimum/i, /merit matrix/i, /compression/i, /pay equity/i];
    for (const pattern of tabsToVisit) {
      const tab = page.getByRole("tab", { name: pattern }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await sleep(5000);
        await page.evaluate(() => window.scrollBy({ top: 280, behavior: "smooth" }));
        await sleep(4000);
        await page.evaluate(() => window.scrollBy({ top: 280, behavior: "smooth" }));
        await sleep(3500);
      }
    }

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(6000);
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
    } else {
      console.warn("ffmpeg not found — only WebM was generated. Run: npx playwright install ffmpeg");
    }
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
