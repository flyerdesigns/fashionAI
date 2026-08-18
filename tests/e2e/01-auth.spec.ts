import { test, expect } from "@playwright/test";
import {
  attachConsoleGuard,
  getTestCredentials,
  hasCredentials,
  login,
  logout,
} from "./helpers/auth";

test.describe("authentication", () => {
  test("login page renders", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    consoleGuard.assertNoCriticalErrors();
  });

  test("protected dashboard requires login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("login, dashboard access, logout", async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!hasCredentials(creds), "SKIPPED — PLAYWRIGHT_TEST_EMAIL/PASSWORD not configured");

    const consoleGuard = attachConsoleGuard(page);
    await login(page, creds.email, creds.password);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    consoleGuard.assertNoCriticalErrors();

    await logout(page);
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });
});
