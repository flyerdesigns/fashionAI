import { test, expect } from "@playwright/test";
import {
  attachConsoleGuard,
  getTestCredentials,
  hasCredentials,
  login,
} from "./helpers/auth";

test.describe("billing", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!hasCredentials(creds), "SKIPPED — PLAYWRIGHT_TEST_EMAIL/PASSWORD not configured");
    await login(page, creds.email, creds.password);
  });

  test("billing page shows plan and upgrade options", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.goto("/settings/billing");

    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(page.getByText("Current plan")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade" }).first()).toBeVisible();
    consoleGuard.assertNoCriticalErrors();
  });

  test("checkout session can be initiated when Stripe is configured", async ({ page }) => {
    test.skip(
      !process.env.STRIPE_SECRET_KEY?.trim(),
      "SKIPPED — STRIPE_SECRET_KEY not configured",
    );

    await page.goto("/settings/billing");
    const upgradeButton = page.getByRole("button", { name: "Upgrade" }).first();

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/billing/checkout") && res.request().method() === "POST",
        { timeout: 15_000 },
      ),
      upgradeButton.click(),
    ]);

    expect([200, 402, 503]).toContain(response.status());
    if (response.status() === 200) {
      const body = (await response.json()) as { url?: string };
      expect(body.url).toBeTruthy();
    }
  });
});
