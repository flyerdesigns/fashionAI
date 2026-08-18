import { test, expect } from "@playwright/test";
import {
  attachConsoleGuard,
  getAdminCredentials,
  getTestCredentials,
  hasCredentials,
  login,
} from "./helpers/auth";

test.describe("admin panel", () => {
  test("normal user cannot access admin", async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!hasCredentials(creds), "SKIPPED — PLAYWRIGHT_TEST_EMAIL/PASSWORD not configured");

    await login(page, creds.email, creds.password);
    await page.goto("/admin");
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).not.toContain("/admin");

    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("admin can access admin dashboard and sections", async ({ page }) => {
    const adminCreds = getAdminCredentials();
    test.skip(
      !hasCredentials(adminCreds),
      "SKIPPED — PLAYWRIGHT_ADMIN_TEST_EMAIL/PASSWORD not configured",
    );

    const consoleGuard = attachConsoleGuard(page);
    await login(page, adminCreds.email, adminCreds.password);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin Overview" })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    await page.goto("/admin/jobs");
    await expect(page.getByRole("heading", { name: "Job Monitor" })).toBeVisible();

    await page.goto("/admin/audit-logs");
    await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();

    consoleGuard.assertNoCriticalErrors();
  });
});
