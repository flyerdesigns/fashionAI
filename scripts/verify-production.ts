/**
 * Production readiness verification.
 *
 * Usage:
 *   npm run verify:production
 *   VERIFY_PRODUCTION=true npm run verify:production
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { validateEnvironment } from "../lib/env/validate";
import { getReadinessCheck } from "../lib/health/checks";
import { loadLocalEnvFiles } from "../lib/env/load-local-env";
import { isStripeConfigured } from "../lib/billing/config";
import { isVideoProviderConfigured } from "../lib/video/config";
import { getRateLimitProviderId } from "../lib/rate-limit";
import { prisma } from "../lib/db/client";
import { isPostgresEnabled } from "../lib/db/config";

type CheckResult = "PASS" | "WARN" | "FAIL" | "SKIP";

interface CheckRow {
  name: string;
  result: CheckResult;
  detail?: string;
}

function isSet(name: string): boolean {
  return !!process.env[name]?.trim();
}

function printSection(title: string, rows: CheckRow[]) {
  console.log(`\n${title}`);
  for (const row of rows) {
    const detail = row.detail ? ` — ${row.detail}` : "";
    console.log(`  [${row.result}] ${row.name}${detail}`);
  }
}

async function checkWorkerHeartbeats(): Promise<CheckRow> {
  if (!isPostgresEnabled() || !isSet("DATABASE_URL")) {
    return { name: "Worker heartbeat", result: "SKIP", detail: "PostgreSQL not enabled" };
  }
  try {
    const staleMs = 5 * 60 * 1000;
    const cutoff = new Date(Date.now() - staleMs);
    const workers = await prisma.workerHeartbeat.findMany({ take: 20 });
    if (workers.length === 0) {
      return {
        name: "Worker heartbeat",
        result: "WARN",
        detail: "No worker heartbeats recorded",
      };
    }
    const stale = workers.filter((w) => w.lastSeenAt < cutoff);
    if (stale.length === workers.length) {
      return { name: "Worker heartbeat", result: "WARN", detail: "All recorded workers are stale" };
    }
    return {
      name: "Worker heartbeat",
      result: "PASS",
      detail: `${workers.length - stale.length}/${workers.length} workers recently active`,
    };
  } catch {
    return { name: "Worker heartbeat", result: "WARN", detail: "Unable to query worker heartbeats" };
  }
}

async function checkMigrations(): Promise<CheckRow> {
  if (!isPostgresEnabled() || !isSet("DATABASE_URL")) {
    return { name: "Migrations", result: "SKIP", detail: "PostgreSQL not enabled" };
  }
  try {
    const pending = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL
    `;
    if (pending.length > 0) {
      return { name: "Migrations", result: "FAIL", detail: `${pending.length} pending migration(s)` };
    }
    return { name: "Migrations", result: "PASS" };
  } catch {
    return { name: "Migrations", result: "WARN", detail: "Could not verify migration table" };
  }
}

function checkBuild(): CheckRow {
  if (process.env.SKIP_VERIFY_BUILD === "true") {
    return { name: "Build artifact", result: "SKIP", detail: "SKIP_VERIFY_BUILD=true" };
  }
  const hasNext = existsSync(".next/BUILD_ID");
  return hasNext
    ? { name: "Build artifact", result: "PASS", detail: ".next/BUILD_ID present" }
    : { name: "Build artifact", result: "WARN", detail: "run npm run build before deploy" };
}

function checkTests(): CheckRow {
  if (process.env.SKIP_VERIFY_TESTS === "true" || process.env.VERIFY_RUN_TESTS !== "true") {
    return {
      name: "Unit tests",
      result: "SKIP",
      detail: "set VERIFY_RUN_TESTS=true to run test:unit here",
    };
  }
  try {
    execSync("npm run test:unit", { stdio: "pipe", env: process.env });
    return { name: "Unit tests", result: "PASS" };
  } catch {
    return { name: "Unit tests", result: "WARN", detail: "test:unit did not pass in verify run" };
  }
}

function sectionStatus(rows: CheckRow[]): CheckResult {
  if (rows.some((r) => r.result === "FAIL")) return "FAIL";
  if (rows.every((r) => r.result === "SKIP")) return "SKIP";
  if (rows.some((r) => r.result === "WARN")) return "WARN";
  return "PASS";
}

function printFinalSummary(sections: Record<string, CheckRow[]>) {
  console.log("\n=== Production Readiness Summary ===");
  for (const [name, rows] of Object.entries(sections)) {
    console.log(`${name.padEnd(14)} ${sectionStatus(rows)}`);
  }
}

async function main() {
  loadLocalEnvFiles();
  console.log("Atelier AI — Production Verification\n");

  const productionMode =
    process.env.VERIFY_PRODUCTION === "true" || process.env.NODE_ENV === "production";

  const envIssues = validateEnvironment({
    mode: productionMode ? "production" : "development",
  });

  const envRows: CheckRow[] = envIssues.map((issue) => ({
    name: issue.key,
    result: issue.level === "error" ? "FAIL" : "WARN",
    detail: issue.message,
  }));
  if (envRows.length === 0) {
    envRows.push({ name: "Environment validation", result: "PASS" });
  }
  printSection("ENVIRONMENT", envRows);

  const databaseRows: CheckRow[] = [
    {
      name: "DATABASE_PROVIDER",
      result:
        !productionMode || process.env.DATABASE_PROVIDER?.trim() === "postgres" ? "PASS" : "FAIL",
    },
    {
      name: "DATABASE_URL",
      result: isSet("DATABASE_URL") ? "PASS" : productionMode ? "FAIL" : "WARN",
    },
    await checkMigrations(),
  ];
  printSection("DATABASE", databaseRows);

  const storageRows: CheckRow[] = [
    {
      name: "STORAGE_PROVIDER",
      result:
        !productionMode || process.env.STORAGE_PROVIDER?.trim() === "s3" ? "PASS" : "FAIL",
    },
    {
      name: "AWS_S3_BUCKET",
      result: isSet("AWS_S3_BUCKET") ? "PASS" : productionMode ? "FAIL" : "WARN",
    },
  ];
  printSection("STORAGE", storageRows);

  const stripeRows: CheckRow[] = [
    {
      name: "Stripe configured",
      result: isStripeConfigured() ? "PASS" : productionMode ? "FAIL" : "WARN",
    },
    {
      name: "STRIPE_STARTER_PRICE_ID",
      result: isSet("STRIPE_STARTER_PRICE_ID") ? "PASS" : "WARN",
    },
  ];
  printSection("STRIPE", stripeRows);

  const geminiRows: CheckRow[] = [
    {
      name: "GEMINI_API_KEY",
      result: isSet("GEMINI_API_KEY") ? "PASS" : productionMode ? "FAIL" : "WARN",
    },
    {
      name: "Video provider",
      result: isVideoProviderConfigured() ? "PASS" : "WARN",
      detail: "Optional unless video is required",
    },
  ];
  printSection("GEMINI", geminiRows);

  const redisRows: CheckRow[] = [
    {
      name: "RATE_LIMIT_PROVIDER",
      result:
        getRateLimitProviderId() === "redis"
          ? isSet("REDIS_URL")
            ? "PASS"
            : "FAIL"
          : productionMode
            ? "WARN"
            : "PASS",
      detail:
        getRateLimitProviderId() === "redis" ? "redis" : "memory (not multi-instance safe)",
    },
  ];
  printSection("REDIS", redisRows);

  const workerRow = await checkWorkerHeartbeats();
  printSection("WORKERS", [workerRow]);

  const health = await getReadinessCheck();
  const healthRows: CheckRow[] = [
    {
      name: "Overall readiness",
      result:
        health.status === "ok" ? "PASS" : health.status === "degraded" ? "WARN" : "FAIL",
      detail: health.status,
    },
    ...Object.entries(health.services).map(([name, status]) => ({
      name,
      result:
        status === "ok"
          ? ("PASS" as const)
          : status === "unavailable"
            ? ("FAIL" as const)
            : ("WARN" as const),
      detail: status,
    })),
  ];
  printSection("HEALTH", healthRows);

  const buildRow = checkBuild();
  const testRow = checkTests();
  printSection("BUILD", [buildRow]);
  printSection("TESTS", [testRow]);

  const configRows: CheckRow[] = [
    { name: "AUTH_SECRET", result: isSet("AUTH_SECRET") ? "PASS" : productionMode ? "FAIL" : "WARN" },
    { name: "APP_URL", result: isSet("APP_URL") ? "PASS" : productionMode ? "FAIL" : "WARN" },
    {
      name: "Sentry",
      result: isSet("SENTRY_DSN") ? "PASS" : "WARN",
      detail: "Optional",
    },
    {
      name: "Admin bootstrap",
      result: isSet("ADMIN_EMAILS") || isSet("ADMIN_EMAIL") ? "PASS" : "WARN",
    },
  ];
  printSection("CONFIGURATION", configRows);

  const sections: Record<string, CheckRow[]> = {
    ENVIRONMENT: envRows,
    DATABASE: databaseRows,
    STORAGE: storageRows,
    STRIPE: stripeRows,
    GEMINI: geminiRows,
    REDIS: redisRows,
    WORKERS: [workerRow],
    HEALTH: healthRows,
    BUILD: [buildRow],
    TESTS: [testRow],
    CONFIGURATION: configRows,
  };

  printFinalSummary(sections);

  const allRows = Object.values(sections).flat();
  const failures = allRows.filter((r) => r.result === "FAIL").length;
  const warnings = allRows.filter((r) => r.result === "WARN").length;

  console.log("\nSummary:");
  console.log(`  FAIL: ${failures}`);
  console.log(`  WARN: ${warnings}`);
  console.log(`  Mode: ${productionMode ? "production validation" : "development validation"}`);
  console.log("\nWorkers: npm run worker:image, npm run worker:video");

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
