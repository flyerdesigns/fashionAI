import { getWorkerHealthReport } from "@/lib/workers/heartbeat";

async function main(): Promise<void> {
  const workers = await getWorkerHealthReport();

  if (workers.length === 0) {
    console.log("No worker heartbeats recorded.");
    process.exit(0);
  }

  let hasStale = false;
  for (const worker of workers) {
    const line = `${worker.workerName} (${worker.workerId}) — ${worker.status} — last seen ${worker.lastSeenAt}${worker.stale ? " [STALE]" : ""}`;
    console.log(line);
    if (worker.stale) hasStale = true;
  }

  process.exit(hasStale ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
