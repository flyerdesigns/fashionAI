import { execSync } from "child_process";

export default async function globalSetup() {
  if (process.env.PLAYWRIGHT_SKIP_SEED === "true") {
    return;
  }

  const shouldSeed =
    process.env.PLAYWRIGHT_SEED === "true" ||
    process.env.CI === "true" ||
    !!process.env.DATABASE_URL;

  if (!shouldSeed) {
    console.log("Playwright global setup: skipping user seed (no DATABASE_URL)");
    return;
  }

  try {
    execSync("tsx scripts/seed-playwright-users.ts", {
      stdio: "inherit",
      env: process.env,
    });
  } catch {
    console.warn("Playwright global setup: user seed failed or skipped");
  }
}
