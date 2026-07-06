import { expect, test } from "playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleCsv = path.resolve(__dirname, "../../sample-data/compensation-sample.csv");

test("landing page loads with pricing and sample preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /find pay issues before leadership review/i })).toBeVisible();
  await page.getByRole("tab", { name: "Pricing" }).click();
  await expect(page.getByText("Cycle Pass")).toBeVisible();
  await page.getByRole("tab", { name: "Sample" }).click();
  await expect(page.getByText(/live demo/i)).toBeVisible();
});

test("trial CTA visible when auth enabled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /try free with your file/i })).toBeVisible();
});

test("sample preview loads demo analysis", async ({ page }) => {
  await page.goto("/sample-preview");
  await expect(page.getByRole("heading", { name: /executive summary/i }).first()).toBeVisible({
    timeout: 15_000,
  });
});

test("legal and trust pages load", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();

  await page.goto("/dpa");
  await expect(page.getByRole("heading", { name: /data processing agreement/i })).toBeVisible();

  await page.goto("/security-summary");
  await expect(page.getByRole("heading", { name: /security summary/i })).toBeVisible();
});

test("health and auth status endpoints respond", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  const healthBody = await health.json();
  expect(healthBody.status).toBe("ok");

  const auth = await request.get("/api/auth/status");
  expect(auth.ok()).toBeTruthy();
  const authBody = await auth.json();
  expect(typeof authBody.auth_enabled).toBe("boolean");
  expect(typeof authBody.trial_enabled).toBe("boolean");
});

test("billing status endpoint responds", async ({ request }) => {
  const response = await request.get("/api/billing/status");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty("enabled");
});

test("trial analyze works without login", async ({ request }) => {
  const auth = await request.get("/api/auth/status");
  const { trial_enabled } = (await auth.json()) as { trial_enabled?: boolean };
  test.skip(!trial_enabled, "Trial disabled in this environment");

  const response = await request.post("/api/analyze", {
    multipart: {
      file: {
        name: "compensation-sample.csv",
        mimeType: "text/csv",
        buffer: await import("node:fs/promises").then((fs) => fs.readFile(sampleCsv)),
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { trial_mode?: boolean };
  expect(body.trial_mode).toBe(true);
});

test("og image assets exist", async ({ request }) => {
  for (const path of ["/social-share.png", "/og-image.png"]) {
    const response = await request.get(path);
    expect(response.ok()).toBeTruthy();
    const body = await response.body();
    expect(body.length).toBeGreaterThan(10_000);
    expect(body.length).toBeLessThan(120_000);
    expect(body[1]).toBe("P".charCodeAt(0));
    expect(body[2]).toBe("N".charCodeAt(0));
    expect(body[3]).toBe("G".charCodeAt(0));
  }
});
