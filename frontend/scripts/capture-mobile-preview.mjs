#!/usr/bin/env node
/**
 * Captures a mobile-width screenshot of the sample analysis dashboard.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 node scripts/capture-mobile-preview.mjs
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

    await page.goto(`${baseUrl}/sample-preview`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /analysis results|complete analyzer view/i }).first().waitFor({
      timeout: 20_000,
    });

    const reviewTab = page.getByRole("tab", { name: /review queue/i });
    if (await reviewTab.isVisible().catch(() => false)) {
      await reviewTab.click();
      await page.waitForTimeout(800);
    }

    const target = page.locator(".sample-preview-page__dashboard").first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await target.screenshot({ path: outPath });
    console.log(`Saved ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
