import { expect, test } from "playwright/test";

test("landing page loads with pricing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /find pay equity issues/i })).toBeVisible();
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await expect(page.getByText("Cycle Pass")).toBeVisible();
});

test("sample preview loads demo analysis", async ({ page }) => {
  await page.goto("/sample-preview");
  await expect(page.getByRole("heading", { name: /executive summary/i }).first()).toBeVisible({
    timeout: 15_000,
  });
});

test("legal pages load", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe("ok");
});
