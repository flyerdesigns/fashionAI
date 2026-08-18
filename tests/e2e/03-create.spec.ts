import { test, expect } from "@playwright/test";
import {
  attachConsoleGuard,
  getTestCredentials,
  hasCredentials,
  login,
} from "./helpers/auth";

test.describe("create flow", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!hasCredentials(creds), "SKIPPED — PLAYWRIGHT_TEST_EMAIL/PASSWORD not configured");
    await login(page, creds.email, creds.password);
  });

  test("create page renders without hydration errors", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.goto("/create");

    await expect(page.getByRole("heading", { name: "Create Photoshoot" })).toBeVisible();
    await expect(page.getByRole("button", { name: /upload a new clothing item/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /choose from my products/i })).toBeVisible();

    const nestedButtons = await page.locator("button button").count();
    expect(nestedButtons).toBe(0);

    consoleGuard.assertNoCriticalErrors();
  });
});
