import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { Prisma } from "@/lib/generated/prisma";
import { LOG_EVENTS } from "@/lib/logging/events";
import { logger } from "@/lib/logging/logger";
import { metrics } from "@/lib/metrics";

export interface HeartbeatInput {
  workerName: string;
  workerId: string;
  status: "running" | "shutting_down" | "idle";
  metadata?: Record<string, unknown>;
}

export async function writeWorkerHeartbeat(input: HeartbeatInput): Promise<void> {
  if (!isPostgresEnabled()) return;

  try {
    await prisma.workerHeartbeat.upsert({
      where: { workerName: input.workerName },
      create: {
        workerName: input.workerName,
        workerId: input.workerId,
        status: input.status,
        lastSeenAt: new Date(),
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
      update: {
        workerId: input.workerId,
        status: input.status,
        lastSeenAt: new Date(),
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    metrics.workerHeartbeatTotal.inc({ workerName: input.workerName });
    logger.debug(LOG_EVENTS.WORKER_HEARTBEAT, {
      event: input.workerName,
      status: input.status,
    });
  } catch (error) {
    logger.warn("worker.heartbeat.failed", {
      event: input.workerName,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getWorkerHealthReport(): Promise<
  Array<{
    workerName: string;
    workerId: string;
    status: string;
    lastSeenAt: string;
    stale: boolean;
  }>
> {
  if (!isPostgresEnabled()) return [];

  const records = await prisma.workerHeartbeat.findMany({
    orderBy: { workerName: "asc" },
  });

  const staleMs = Number(process.env.WORKER_HEARTBEAT_STALE_MS ?? "60000");
  const now = Date.now();

  return records.map((record) => ({
    workerName: record.workerName,
    workerId: record.workerId,
    status: record.status,
    lastSeenAt: record.lastSeenAt.toISOString(),
    stale: now - record.lastSeenAt.getTime() > staleMs,
  }));
}
