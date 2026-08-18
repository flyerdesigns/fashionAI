import { logger } from "@/lib/logging/logger";
import { bindQueueWakeSignal, type JobQueueScope } from "@/lib/queue";
import { writeWorkerHeartbeat } from "@/lib/workers/heartbeat";

export interface GracefulWorkerOptions {
  name: string;
  pollMs: number;
  scope?: JobQueueScope;
  processNext: () => Promise<boolean>;
}

export function createGracefulWorker(options: GracefulWorkerOptions): void {
  const workerId = `${options.name}-${process.pid}`;
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("worker.shutdown", {
      event: options.name,
      status: signal,
    });
    void writeWorkerHeartbeat({
      workerName: options.name,
      workerId,
      status: "shutting_down",
    });
    setTimeout(() => process.exit(0), 500);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  logger.info("worker.started", {
    event: options.name,
    status: "running",
  });

  void writeWorkerHeartbeat({
    workerName: options.name,
    workerId,
    status: "running",
  });

  const tick = async () => {
    if (shuttingDown) return;
    try {
      const processed = await options.processNext();
      await writeWorkerHeartbeat({
        workerName: options.name,
        workerId,
        status: processed ? "running" : "idle",
      });
      if (!processed && !shuttingDown) {
        await sleep(options.pollMs);
      }
    } catch (error) {
      logger.error("worker.tick.failed", {
        event: options.name,
        message: error instanceof Error ? error.message : String(error),
      });
      if (!shuttingDown) await sleep(options.pollMs);
    }
  };

  void tick();
  const interval = setInterval(() => void tick(), options.pollMs);
  interval.unref();

  if (options.scope) {
    void bindQueueWakeSignal(options.scope, () => {
      if (!shuttingDown) void tick();
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
