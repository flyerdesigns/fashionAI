/**
 * 24-hour soak test tooling (safe defaults — no continuous AI generation).
 *
 * Usage:
 *   SOAK_DURATION_HOURS=24 SOAK_INTERVAL_SECONDS=60 tsx scripts/soak-test.ts
 *
 * Optional (disabled by default):
 *   SOAK_RUN_GENERATION_CHECK=true  — single low-cost health ping only
 */
import { getReadinessCheck } from "../lib/health/checks";
import { isPostgresEnabled } from "../lib/db/config";
import { prisma } from "../lib/db/client";

interface SoakStats {
  startedAt: string;
  checks: number;
  healthFailures: number;
  workerStaleEvents: number;
  storageFailures: number;
  apiErrors: number;
  warnings: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkWorkers(): Promise<{ ok: boolean; detail: string }> {
  if (!isPostgresEnabled()) {
    return { ok: true, detail: "postgres not enabled" };
  }
  const staleMs = Number(process.env.WORKER_HEARTBEAT_STALE_MS ?? 300_000);
  const cutoff = new Date(Date.now() - staleMs);
  const workers = await prisma.workerHeartbeat.findMany({ take: 20 });
  if (workers.length === 0) {
    return { ok: false, detail: "no worker heartbeats" };
  }
  const fresh = workers.filter((w) => w.lastSeenAt >= cutoff);
  return {
    ok: fresh.length > 0,
    detail: `${fresh.length}/${workers.length} workers fresh`,
  };
}

async function checkHealth(): Promise<boolean> {
  const health = await getReadinessCheck();
  return health.status !== "unavailable";
}

async function optionalGenerationPing(baseUrl: string): Promise<boolean> {
  if (process.env.SOAK_RUN_GENERATION_CHECK !== "true") {
    return true;
  }
  try {
    const response = await fetch(`${baseUrl}/api/health/ready`, {
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok || response.status === 503;
  } catch {
    return false;
  }
}

async function main() {
  const durationHours = Number(process.env.SOAK_DURATION_HOURS ?? 24);
  const intervalSeconds = Number(process.env.SOAK_INTERVAL_SECONDS ?? 60);
  const baseUrl = (process.env.STAGING_BASE_URL ?? process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const endAt = Date.now() + durationHours * 60 * 60 * 1000;
  const stats: SoakStats = {
    startedAt: new Date().toISOString(),
    checks: 0,
    healthFailures: 0,
    workerStaleEvents: 0,
    storageFailures: 0,
    apiErrors: 0,
    warnings: [],
  };

  console.log(`Soak test started — duration ${durationHours}h, interval ${intervalSeconds}s`);
  console.log(`Target: ${baseUrl}`);
  console.log("AI generation is disabled unless SOAK_RUN_GENERATION_CHECK=true\n");

  while (Date.now() < endAt) {
    stats.checks += 1;

    const healthOk = await checkHealth();
    if (!healthOk) {
      stats.healthFailures += 1;
      stats.warnings.push(`${new Date().toISOString()} health unavailable`);
    }

    try {
      const live = await fetch(`${baseUrl}/api/health/live`, { signal: AbortSignal.timeout(10_000) });
      if (!live.ok) {
        stats.apiErrors += 1;
      }
    } catch {
      stats.apiErrors += 1;
    }

    const workers = await checkWorkers();
    if (!workers.ok) {
      stats.workerStaleEvents += 1;
      stats.warnings.push(`${new Date().toISOString()} workers: ${workers.detail}`);
    }

    const genOk = await optionalGenerationPing(baseUrl);
    if (!genOk) {
      stats.storageFailures += 1;
    }

    if (stats.checks % 10 === 0) {
      console.log(
        `[${new Date().toISOString()}] checks=${stats.checks} health_failures=${stats.healthFailures} worker_stale=${stats.workerStaleEvents}`,
      );
    }

    await sleep(intervalSeconds * 1000);
  }

  console.log("\nSoak test summary:");
  console.log(JSON.stringify(stats, null, 2));

  const failed = stats.healthFailures > 0 || stats.apiErrors > 5;
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
