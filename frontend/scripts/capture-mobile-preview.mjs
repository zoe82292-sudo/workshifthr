#!/usr/bin/env node
/**
 * Captures a mobile-width screenshot of the polished marketing dashboard.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outPath = path.join(publicDir, "demo-mobile-preview.png");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";

async function main() {
  fs.mkdirSync(publicDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  try {
    const health = await page.request.get(`${baseUrl}/api/health`);
    if (!health.ok()) {
      throw new Error(`App not reachable at ${baseUrl}`);
    }

    await page.goto(`${baseUrl}/demo-video?scene=3`, { waitUntil: "networkidle" });
    await page.waitForSelector(".demo-video-layer--active .marketing-preview", { timeout: 15_000 });
    await page.locator(".demo-video-layer--active .marketing-preview").screenshot({ path: outPath });
    console.log(`Saved ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
