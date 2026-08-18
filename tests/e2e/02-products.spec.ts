import { test, expect } from "@playwright/test";
import {
  attachConsoleGuard,
  getTestCredentials,
  hasCredentials,
  login,
} from "./helpers/auth";

test.describe("products", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!hasCredentials(creds), "SKIPPED — PLAYWRIGHT_TEST_EMAIL/PASSWORD not configured");
    await login(page, creds.email, creds.password);
  });

  test("products page renders without console errors", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "My Products" })).toBeVisible();
    consoleGuard.assertNoCriticalErrors();
  });
});
