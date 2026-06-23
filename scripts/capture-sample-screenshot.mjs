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
  viewport: { width: 1180, height: 1400 },
  deviceScaleFactor: 2,
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });

const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(sampleFile);
await page.waitForSelector("#sample-output-root h2:text('Analysis results')", {
  timeout: 60000,
});
await page.waitForSelector("#sample-output-root .summary-grid .summary-card", {
  timeout: 60000,
});

await page.addStyleTag({
  content: `
    .app-shell > .hero,
    .app-shell > .panel:not(#sample-output-root),
    .app-shell > .alert,
    .legal-footer,
    .session-bar {
      display: none !important;
    }
    body {
      background: #f4f1ea !important;
    }
    .app-shell {
      max-width: 1120px !important;
      padding: 16px 20px 20px !important;
    }
    #sample-output-root {
      margin: 0 !important;
      box-shadow: none !important;
    }
    #sample-output-root .alert {
      display: none !important;
    }
    #sample-output-root .tabs {
      flex-wrap: nowrap;
      overflow: hidden;
    }
    #sample-output-root .table-wrap {
      max-height: 220px;
      overflow: hidden;
    }
  `,
});

await page.click('#sample-output-root button.tab:has-text("Below Minimum")');
await page.waitForSelector("#sample-output-root table tbody tr", { timeout: 10000 });
await page.waitForTimeout(500);

const target = page.locator("#sample-output-root");
await target.screenshot({
  path: outputFile,
  animations: "disabled",
});

await browser.close();
console.log(`Saved screenshot to ${outputFile}`);
