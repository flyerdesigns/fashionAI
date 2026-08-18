import type { JobQueue, JobQueueMessage, JobQueueScope } from "./types";
import { logLocalQueueFallback } from "./local-queue";
import { logger } from "@/lib/logging/logger";

const QUEUE_NAMES: Record<JobQueueScope, string> = {
  image: "atelier:jobs:image",
  video: "atelier:jobs:video",
};

export class BullMQJobQueue implements JobQueue {
  private connection: import("ioredis").default | null = null;
  private queues = new Map<JobQueueScope, import("bullmq").Queue>();

  private async getConnection(): Promise<import("ioredis").default> {
    if (this.connection) return this.connection;
    const url = process.env.REDIS_URL?.trim();
    if (!url) throw new Error("REDIS_URL is required for BullMQ queue provider.");

    const IORedis = (await import("ioredis")).default;
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    return this.connection;
  }

  private async getQueue(scope: JobQueueScope): Promise<import("bullmq").Queue> {
    const existing = this.queues.get(scope);
    if (existing) return existing;

    const { Queue } = await import("bullmq");
    const connection = await this.getConnection();
    const queue = new Queue(QUEUE_NAMES[scope], { connection });
    this.queues.set(scope, queue);
    return queue;
  }

  async enqueue(message: JobQueueMessage): Promise<void> {
    const queue = await this.getQueue(message.scope);
    await queue.add(
      "process",
      { jobId: message.jobId },
      {
        removeOnComplete: 100,
        removeOnFail: 100,
        jobId: `${message.scope}:${message.jobId}`,
      },
    );
    logger.debug("queue.enqueued", {
      event: message.scope,
      jobId: message.jobId,
    });
  }

  async createWakeSignal(
    scope: JobQueueScope,
    onWake: () => void,
  ): Promise<() => void> {
    const { Worker } = await import("bullmq");
    const connection = await this.getConnection();
    const worker = new Worker(
      QUEUE_NAMES[scope],
      async () => {
        onWake();
      },
      {
        connection,
        concurrency: 1,
      },
    );

    worker.on("error", (error) => {
      logger.error("queue.worker.error", {
        event: scope,
        message: error.message,
      });
    });

    return async () => {
      await worker.close();
    };
  }
}

let bullmqInstance: BullMQJobQueue | null = null;

export function getBullMQJobQueue(): BullMQJobQueue {
  if (!bullmqInstance) bullmqInstance = new BullMQJobQueue();
  return bullmqInstance;
}

export function canUseBullMQ(): boolean {
  return !!process.env.REDIS_URL?.trim();
}

export function warnBullMQFallback(): void {
  logLocalQueueFallback("BullMQ unavailable — falling back to DB polling only.");
}
