/**
 * Step 17 — staging certification orchestrator.
 * Runs the existing validation path and reports PASS / FAIL / BLOCKED / SKIP.
 * Never prints secret values.
 *
 * Usage:
 *   npm run certify:staging
 *   STAGING_CERT_STRICT=true npm run certify:staging
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadLocalEnvFiles } from "../lib/env/load-local-env";
import {
  formatStagingEnvReport,
  getStagingEnvReport,
  stagingEnvHasBlockingIssues,
} from "../lib/env/staging-status";

type Status = "PASS" | "FAIL" | "BLOCKED" | "SKIP";

interface ResultRow {
  name: string;
  status: Status;
  detail?: string;
}

const results: ResultRow[] = [];
const strict = process.env.STAGING_CERT_STRICT === "true";

function record(name: string, status: Status, detail?: string) {
  results.push({ name, status, detail });
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`  [${status}] ${name}${suffix}`);
}

function runNpm(script: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    shell: true,
    env,
  });
  return (result.status ?? 1) === 0;
}

function hasPostgresEnv(): boolean {
  return (
    process.env.DATABASE_PROVIDER === "postgres" &&
    !!process.env.DATABASE_URL?.trim()
  );
}

function hasPlaywrightCreds(): boolean {
  return (
    !!process.env.PLAYWRIGHT_TEST_EMAIL?.trim() &&
    !!process.env.PLAYWRIGHT_TEST_PASSWORD?.trim() &&
    !!process.env.PLAYWRIGHT_ADMIN_TEST_EMAIL?.trim() &&
    !!process.env.PLAYWRIGHT_ADMIN_TEST_PASSWORD?.trim() &&
    !!process.env.PLAYWRIGHT_SUSPENDED_TEST_EMAIL?.trim() &&
    !!process.env.PLAYWRIGHT_SUSPENDED_TEST_PASSWORD?.trim()
  );
}

function hasS3Env(): boolean {
  return (
    process.env.STORAGE_PROVIDER === "s3" &&
    !!process.env.AWS_S3_BUCKET?.trim() &&
    !!process.env.AWS_ACCESS_KEY_ID?.trim() &&
    !!process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );
}

function hasStripeTestEnv(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  return key.startsWith("sk_test_") && !!process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

function hasGenerationEnv(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

function hasRedisEnv(): boolean {
  return !!process.env.REDIS_URL?.trim();
}

function hasStagingUrl(): boolean {
  return !!(process.env.STAGING_BASE_URL?.trim() || process.env.PLAYWRIGHT_BASE_URL?.trim());
}

async function main() {
  loadLocalEnvFiles();
  console.log("Atelier AI — Step 17 Staging Certification\n");

  console.log("Infrastructure probe");
  const probe = spawnSync("npm", ["run", "probe:infrastructure"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if ((probe.status ?? 1) !== 0) {
    record("Infrastructure probe", "BLOCKED", "PostgreSQL/Redis not reachable locally");
  } else {
    record("Infrastructure probe", "PASS");
  }

  console.log("\nInfrastructure");
  const dockerAvailable = spawnSync("docker", ["--version"], { encoding: "utf8" }).status === 0;
  if (dockerAvailable) {
    record("Docker", "PASS");
  } else {
    record("Docker", "BLOCKED", "docker not installed — use managed Postgres/Redis or install Docker");
  }

  if (hasPostgresEnv()) {
    record("PostgreSQL env", "PASS");
  } else {
    record("PostgreSQL env", "BLOCKED", "DATABASE_PROVIDER=postgres and DATABASE_URL required");
  }

  if (hasRedisEnv()) {
    record("Redis env", "PASS");
  } else {
    record("Redis env", "BLOCKED", "REDIS_URL required for workers and rate limiting");
  }

  console.log("\nEnvironment validation");
  const envRows = getStagingEnvReport({ production: true });
  console.log(formatStagingEnvReport(envRows));
  if (stagingEnvHasBlockingIssues(envRows)) {
    record("validate:staging:env", "FAIL", "MISSING or INVALID required variables");
  } else {
    record("validate:staging:env", "PASS");
  }

  console.log("\nDatabase");
  if (!hasPostgresEnv()) {
    record("validate:database", "BLOCKED", "PostgreSQL not configured");
    record("prisma migrate deploy", "BLOCKED", "PostgreSQL not configured");
  } else {
    const dbOk = runNpm("validate:database");
    record("validate:database", dbOk ? "PASS" : "FAIL");
    const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    record("prisma migrate deploy", (migrate.status ?? 1) === 0 ? "PASS" : "FAIL");
  }

  console.log("\nAutomated tests");
  record("lint", runNpm("lint") ? "PASS" : "FAIL");
  record("test:unit", runNpm("test:unit") ? "PASS" : "FAIL");
  record("test:smoke", runNpm("test:smoke") ? "PASS" : "FAIL");

  if (!process.env.DATABASE_URL_TEST?.trim()) {
    record("test:integration", "BLOCKED", "DATABASE_URL_TEST not set");
  } else {
    record("test:integration", runNpm("test:integration") ? "PASS" : "FAIL");
  }

  if (!process.env.DATABASE_URL_TEST?.trim()) {
    record("test:security", "BLOCKED", "DATABASE_URL_TEST not set");
  } else {
    record("test:security", runNpm("test:security") ? "PASS" : "FAIL");
  }

  console.log("\nBuild & Playwright");
  record("build", runNpm("build") ? "PASS" : "FAIL");

  if (!hasPostgresEnv() || !hasPlaywrightCreds()) {
    record("seed:playwright", "BLOCKED", "PostgreSQL + PLAYWRIGHT_* credentials required");
    record("test:e2e", "BLOCKED", "PostgreSQL + PLAYWRIGHT_* credentials required");
  } else {
    const seedOk = runNpm("seed:playwright", { ...process.env, PLAYWRIGHT_SEED: "true" });
    record("seed:playwright", seedOk ? "PASS" : "FAIL");
    const e2eOk = runNpm("test:e2e", {
      ...process.env,
      PLAYWRIGHT_WEBSERVER_CMD: process.env.PLAYWRIGHT_WEBSERVER_CMD ?? "npm run start",
      PLAYWRIGHT_SEED: "true",
    });
    record("test:e2e", e2eOk ? "PASS" : "FAIL");
  }

  console.log("\nProvider validation");
  if (!hasS3Env()) {
    record("verify:staging:storage", "BLOCKED", "STORAGE_PROVIDER=s3 and AWS credentials required");
  } else {
    record(
      "verify:staging:storage",
      runNpm("verify:staging:storage", { ...process.env, STAGING_ENV: "staging" })
        ? "PASS"
        : "FAIL",
    );
  }

  if (!hasStripeTestEnv()) {
    record("verify:staging:stripe", "BLOCKED", "Stripe TEST keys (sk_test_*) required");
  } else {
    record("verify:staging:stripe", runNpm("verify:staging:stripe") ? "PASS" : "FAIL");
  }

  if (!hasGenerationEnv() || !hasPostgresEnv()) {
    record("verify:staging:generation", "BLOCKED", "GEMINI_API_KEY + PostgreSQL required");
  } else {
    record("verify:staging:generation", runNpm("verify:staging:generation") ? "PASS" : "FAIL");
  }

  console.log("\nWorkers & soak");
  if (!hasPostgresEnv() || !hasRedisEnv()) {
    record("workers:health", "BLOCKED", "PostgreSQL + Redis + running workers required");
  } else if (!existsSync(".next/BUILD_ID")) {
    record("workers:health", "BLOCKED", "build required before worker validation");
  } else {
    record(
      "workers:health",
      "BLOCKED",
      "Start npm run worker:image and npm run worker:video in separate terminals, then rerun workers:health",
    );
  }

  if (!hasStagingUrl()) {
    record("staging:smoke", "BLOCKED", "STAGING_BASE_URL required");
  } else {
    record("staging:smoke", runNpm("staging:smoke") ? "PASS" : "FAIL");
  }

  if (!hasStagingUrl()) {
    record("soak:test (24h)", "BLOCKED", "STAGING_BASE_URL required");
  } else if (process.env.SOAK_DURATION_HOURS !== "24") {
    record(
      "soak:test (24h)",
      "BLOCKED",
      "Set SOAK_DURATION_HOURS=24 after all other checks pass",
    );
  } else {
    record("soak:test (24h)", runNpm("soak:test") ? "PASS" : "FAIL");
  }

  console.log("\nProduction verification");
  const verifyOk = runNpm("verify:production", {
    ...process.env,
    VERIFY_PRODUCTION: "true",
    VERIFY_RUN_TESTS: "true",
  });
  record("verify:production", verifyOk ? "PASS" : "FAIL");

  console.log("\n=== Step 17 Certification Summary ===");
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const skip = results.filter((r) => r.status === "SKIP").length;

  console.log(`PASS=${pass} FAIL=${fail} BLOCKED=${blocked} SKIP=${skip}`);

  const goReady =
    fail === 0 &&
    blocked === 0 &&
    results.every((r) => r.status === "PASS" || r.status === "SKIP");

  console.log(`\nFinal Decision: ${goReady ? "GO" : "NO-GO"}`);

  if (strict && (fail > 0 || blocked > 0)) {
    process.exit(1);
  }
  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
