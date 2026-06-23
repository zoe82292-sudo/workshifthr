import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputFile = path.join(root, "frontend/public/sample-output.png");
const previewUrl = "http://127.0.0.1:8080/marketing-preview";

await mkdir(path.dirname(outputFile), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1180, height: 1200 },
  deviceScaleFactor: 2,
});

await page.goto(previewUrl, { waitUntil: "networkidle" });
await page.waitForSelector("#marketing-preview-root h1:text('Analysis results')", {
  timeout: 60000,
});
await page.waitForSelector("#marketing-preview-root table tbody tr", {
  timeout: 60000,
});
await page.waitForTimeout(500);

await page.locator("#marketing-preview-root").screenshot({
  path: outputFile,
  animations: "disabled",
});

await browser.close();
console.log(`Saved screenshot to ${outputFile}`);
