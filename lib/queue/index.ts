import type { JobQueue, JobQueueMessage, JobQueueScope } from "./types";
import { getLocalJobQueue, createLocalWakeSignal } from "./local-queue";
import {
  getBullMQJobQueue,
  canUseBullMQ,
  warnBullMQFallback,
} from "./bullmq-queue";

export type QueueProviderId = "local" | "bullmq";

export function getQueueProviderId(): QueueProviderId {
  const provider = process.env.QUEUE_PROVIDER?.trim().toLowerCase();
  if (provider === "bullmq") return "bullmq";
  return "local";
}

let queueInstance: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (queueInstance) return queueInstance;

  const provider = getQueueProviderId();
  if (provider === "bullmq" && canUseBullMQ()) {
    queueInstance = getBullMQJobQueue();
    return queueInstance;
  }

  if (provider === "bullmq") {
    warnBullMQFallback();
  }

  queueInstance = getLocalJobQueue();
  return queueInstance;
}

export async function notifyJobQueued(
  scope: JobQueueScope,
  jobId: string,
): Promise<void> {
  try {
    await getJobQueue().enqueue({ scope, jobId });
  } catch {
    // Queue notification is best-effort; DB polling remains the source of truth.
  }
}

export async function bindQueueWakeSignal(
  scope: JobQueueScope,
  onWake: () => void,
): Promise<() => void> {
  const queue = getJobQueue();
  if (queue.createWakeSignal) {
    try {
      return await queue.createWakeSignal(scope, onWake);
    } catch {
      return createLocalWakeSignal(scope, onWake);
    }
  }
  return createLocalWakeSignal(scope, onWake);
}

export type { JobQueueMessage, JobQueueScope };
