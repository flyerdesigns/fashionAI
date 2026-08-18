import { test, expect } from "@playwright/test";
import {
  getAdminCredentials,
  getSuspendedCredentials,
  getTestCredentials,
  hasCredentials,
  login,
} from "./helpers/auth";

test.describe("account suspension", () => {
  test("suspended user cannot log in", async ({ page }) => {
    const creds = getSuspendedCredentials();
    test.skip(
      !hasCredentials(creds),
      "SKIPPED — PLAYWRIGHT_SUSPENDED_TEST_EMAIL/PASSWORD not configured",
    );

    await page.goto("/login");
    await page.locator("#email").fill(creds.email);
    await page.locator("#password").fill(creds.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("active user is redirected after admin suspends account", async ({ browser }) => {
    const userCreds = getTestCredentials();
    const adminCreds = getAdminCredentials();
    test.skip(
      !hasCredentials(userCreds) || !hasCredentials(adminCreds),
      "SKIPPED — test and admin credentials required",
    );

    const userContext = await browser.newContext();
    const adminContext = await browser.newContext();
    const userPage = await userContext.newPage();
    const adminPage = await adminContext.newPage();

    await login(userPage, userCreds.email, userCreds.password);
    await login(adminPage, adminCreds.email, adminCreds.password);

    const usersResponse = await adminPage.request.get("/api/admin/users?search=" + encodeURIComponent(userCreds.email));
    expect(usersResponse.status()).toBe(200);
    const usersBody = (await usersResponse.json()) as {
      items?: Array<{ id: string; email: string }>;
    };
    const target = usersBody.items?.find(
      (item) => item.email.toLowerCase() === userCreds.email.toLowerCase(),
    );
    expect(target?.id).toBeTruthy();

    const suspendResponse = await adminPage.request.patch(`/api/admin/users/${target!.id}/status`, {
      data: { status: "suspended" },
    });
    expect(suspendResponse.status()).toBe(200);

    await userPage.goto("/dashboard");
    await userPage.waitForURL(/\/account-suspended/, { timeout: 15_000 });
    await expect(userPage.getByRole("heading", { name: /account suspended/i })).toBeVisible();

    await adminPage.request.patch(`/api/admin/users/${target!.id}/status`, {
      data: { status: "active" },
    });

    await userContext.close();
    await adminContext.close();
  });

  test("suspended session can access billing recovery API", async ({ browser }) => {
    const userCreds = getTestCredentials();
    const adminCreds = getAdminCredentials();
    test.skip(
      !hasCredentials(userCreds) || !hasCredentials(adminCreds),
      "SKIPPED — test and admin credentials required",
    );

    const userContext = await browser.newContext();
    const adminContext = await browser.newContext();
    const userPage = await userContext.newPage();
    const adminPage = await adminContext.newPage();

    await login(userPage, userCreds.email, userCreds.password);
    await login(adminPage, adminCreds.email, adminCreds.password);

    const usersResponse = await adminPage.request.get("/api/admin/users?search=" + encodeURIComponent(userCreds.email));
    const usersBody = (await usersResponse.json()) as {
      items?: Array<{ id: string; email: string }>;
    };
    const target = usersBody.items?.find(
      (item) => item.email.toLowerCase() === userCreds.email.toLowerCase(),
    );
    if (!target?.id) {
      test.skip(true, "SKIPPED — test user not found in admin list");
    }

    await adminPage.request.patch(`/api/admin/users/${target!.id}/status`, {
      data: { status: "suspended" },
    });

    const subscriptionResponse = await userPage.request.get("/api/billing/subscription");
    expect(subscriptionResponse.status()).toBe(200);

    const creditsResponse = await userPage.request.get("/api/credits");
    expect(creditsResponse.status()).toBe(403);

    await adminPage.request.patch(`/api/admin/users/${target!.id}/status`, {
      data: { status: "active" },
    });

    await userContext.close();
    await adminContext.close();
  });

  test("normal user receives 403 on admin API", async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!hasCredentials(creds), "SKIPPED — PLAYWRIGHT_TEST_EMAIL/PASSWORD not configured");

    await login(page, creds.email, creds.password);
    const response = await page.request.get("/api/admin/stats");
    expect(response.status()).toBe(403);
  });
});
