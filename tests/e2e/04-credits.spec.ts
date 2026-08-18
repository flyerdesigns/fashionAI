import { test, expect } from "@playwright/test";
import {
  attachConsoleGuard,
  getTestCredentials,
  hasCredentials,
  login,
} from "./helpers/auth";

test.describe("credits", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!hasCredentials(creds), "SKIPPED — PLAYWRIGHT_TEST_EMAIL/PASSWORD not configured");
    await login(page, creds.email, creds.password);
  });

  test("credits page shows balance and history section", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.goto("/credits");

    await expect(page.getByRole("heading", { name: "Credits" })).toBeVisible();
    await expect(page.getByText("Available")).toBeVisible();
    consoleGuard.assertNoCriticalErrors();
  });
});
