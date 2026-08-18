/**
 * Staging smoke test — reachable app + subsystem checks.
 *
 * Usage:
 *   STAGING_BASE_URL=https://staging.example.com tsx scripts/staging-smoke.ts
 */
import { validateEnvironment } from "../lib/env/validate";
import { getReadinessCheck } from "../lib/health/checks";
import { isStripeConfigured } from "../lib/billing/config";
import { isVideoProviderConfigured } from "../lib/video/config";
import { getRateLimitProviderId } from "../lib/rate-limit";
import { isPostgresEnabled } from "../lib/db/config";
import { prisma } from "../lib/db/client";

type Result = "PASS" | "WARN" | "FAIL" | "SKIP";

interface Row {
  name: string;
  result: Result;
  detail?: string;
}

function isSet(name: string): boolean {
  return !!process.env[name]?.trim();
}

function printSection(title: string, rows: Row[]) {
  console.log(`\n${title}`);
  for (const row of rows) {
    console.log(`  [${row.result}] ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
  }
}

async function checkAppReachable(baseUrl: string): Promise<Row> {
  try {
    const response = await fetch(`${baseUrl}/api/health/live`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      return { name: "Application reachable", result: "FAIL", detail: `live HTTP ${response.status}` };
    }
    return { name: "Application reachable", result: "PASS", detail: baseUrl };
  } catch (error) {
    return {
      name: "Application reachable",
      result: "FAIL",
      detail: error instanceof Error ? error.message : "fetch failed",
    };
  }
}

async function checkWorkerHeartbeats(): Promise<Row> {
  if (!isPostgresEnabled()) {
    return { name: "Worker heartbeat", result: "SKIP", detail: "PostgreSQL not enabled" };
  }
  try {
    const staleMs = Number(process.env.WORKER_HEARTBEAT_STALE_MS ?? 300_000);
    const cutoff = new Date(Date.now() - staleMs);
    const workers = await prisma.workerHeartbeat.findMany({ take: 20 });
    if (workers.length === 0) {
      return { name: "Worker heartbeat", result: "WARN", detail: "no heartbeats recorded" };
    }
    const fresh = workers.filter((w) => w.lastSeenAt >= cutoff);
    if (fresh.length === 0) {
      return { name: "Worker heartbeat", result: "FAIL", detail: "all workers stale" };
    }
    return {
      name: "Worker heartbeat",
      result: "PASS",
      detail: `${fresh.length}/${workers.length} fresh`,
    };
  } catch {
    return { name: "Worker heartbeat", result: "WARN", detail: "query failed" };
  }
}

async function main() {
  console.log("Atelier AI — Staging Smoke Test\n");

  const baseUrl = (process.env.STAGING_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const productionMode = process.env.STAGING_VALIDATE_PRODUCTION === "true";

  const rows: Row[] = [];
  rows.push(await checkAppReachable(baseUrl));

  for (const path of ["/api/health", "/api/health/ready"]) {
    try {
      const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(15_000) });
      rows.push({
        name: path,
        result: response.ok || response.status === 503 ? "PASS" : "FAIL",
        detail: `HTTP ${response.status}`,
      });
    } catch (error) {
      rows.push({
        name: path,
        result: "FAIL",
        detail: error instanceof Error ? error.message : "fetch failed",
      });
    }
  }

  printSection("HTTP checks", rows);

  const envIssues = validateEnvironment({ mode: productionMode ? "production" : "development" });
  const envRows: Row[] = envIssues.map((issue) => ({
    name: issue.key,
    result: issue.level === "error" ? "FAIL" : "WARN",
    detail: issue.message,
  }));
  if (envRows.length === 0) envRows.push({ name: "Environment", result: "PASS" });
  printSection("Environment", envRows);

  const configRows: Row[] = [
    { name: "Database", result: isPostgresEnabled() && isSet("DATABASE_URL") ? "PASS" : "FAIL" },
    { name: "Storage", result: isSet("STORAGE_PROVIDER") ? "PASS" : "WARN" },
    { name: "Stripe", result: isStripeConfigured() ? "PASS" : "WARN" },
    { name: "Gemini image", result: isSet("GEMINI_API_KEY") ? "PASS" : "WARN" },
    { name: "Video provider", result: isVideoProviderConfigured() ? "PASS" : "WARN" },
    {
      name: "Redis",
      result:
        getRateLimitProviderId() === "redis"
          ? isSet("REDIS_URL")
            ? "PASS"
            : "FAIL"
          : "WARN",
      detail: getRateLimitProviderId() === "redis" ? "required" : "memory provider",
    },
  ];
  printSection("Configuration", configRows);

  const health = await getReadinessCheck();
  const healthRows: Row[] = Object.entries(health.services).map(([name, status]) => ({
    name,
    result: status === "ok" ? "PASS" : status === "unavailable" ? "FAIL" : "WARN",
    detail: status,
  }));
  printSection("Health services", healthRows);

  const workerRow = await checkWorkerHeartbeats();
  printSection("Workers", [workerRow]);

  const all = [...rows, ...envRows, ...configRows, ...healthRows, workerRow];
  const failures = all.filter((r) => r.result === "FAIL").length;
  const warnings = all.filter((r) => r.result === "WARN").length;

  console.log("\nSummary:");
  console.log(`  FAIL: ${failures}`);
  console.log(`  WARN: ${warnings}`);

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
