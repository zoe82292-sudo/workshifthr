import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sampleFile = path.join(root, "sample-data/compensation-sample.csv");
const outputFile = path.join(root, "frontend/public/sample-output.png");

await mkdir(path.dirname(outputFile), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });

const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(sampleFile);
await page.waitForSelector('h2:text("Analysis results")', { timeout: 60000 });
await page.waitForSelector(".summary-grid .summary-card", { timeout: 60000 });
await page.waitForTimeout(400);

const resultsPanel = page.locator("section.panel").last();
await resultsPanel.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);

const panelBox = await resultsPanel.boundingBox();
if (panelBox) {
  await page.screenshot({
    path: outputFile,
    clip: {
      x: Math.max(panelBox.x - 8, 0),
      y: Math.max(panelBox.y - 8, 0),
      width: Math.min(panelBox.width + 16, 1280),
      height: Math.min(panelBox.height + 16, 900),
    },
  });
} else {
  await resultsPanel.screenshot({ path: outputFile });
}

await browser.close();
console.log(`Saved screenshot to ${outputFile}`);
