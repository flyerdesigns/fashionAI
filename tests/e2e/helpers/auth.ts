import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Console messages ignored in E2E (documented harmless dev warnings). */
const IGNORED_CONSOLE_PATTERNS = [
  /Download the React DevTools/i,
  /webpack/i,
  /Fast Refresh/i,
  /middleware.*deprecated/i,
  /proxy instead/i,
];

export function isIgnoredConsoleMessage(message: string): boolean {
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(message));
}

export interface ConsoleGuard {
  assertNoCriticalErrors: () => void;
  getErrors: () => string[];
}

export function attachConsoleGuard(page: Page): ConsoleGuard {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return {
    getErrors: () => [...errors],
    assertNoCriticalErrors: () => {
      const hydrationErrors = errors.filter((entry) =>
        /hydration|did not match|nested.*button|cannot be a descendant/i.test(entry),
      );
      expect(hydrationErrors, `Hydration/console errors:\n${errors.join("\n")}`).toHaveLength(
        0,
      );

      const critical = errors.filter((entry) => !isIgnoredConsoleMessage(entry));
      expect(critical, `Browser console errors:\n${critical.join("\n")}`).toHaveLength(0);
    },
  };
}

export function getTestCredentials(): {
  email: string;
  password: string;
} | null {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL?.trim();
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function getAdminCredentials(): {
  email: string;
  password: string;
} | null {
  const email = process.env.PLAYWRIGHT_ADMIN_TEST_EMAIL?.trim();
  const password = process.env.PLAYWRIGHT_ADMIN_TEST_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function getSuspendedCredentials(): {
  email: string;
  password: string;
} | null {
  const email = process.env.PLAYWRIGHT_SUSPENDED_TEST_EMAIL?.trim();
  const password = process.env.PLAYWRIGHT_SUSPENDED_TEST_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/, { timeout: 15_000 });
}

export function hasCredentials(
  creds: { email: string; password: string } | null,
): creds is { email: string; password: string } {
  return creds !== null;
}
