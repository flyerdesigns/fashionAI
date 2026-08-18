import type { JobQueue, JobQueueMessage } from "./types";
import { logger } from "@/lib/logging/logger";

export class LocalJobQueue implements JobQueue {
  async enqueue(_message: JobQueueMessage): Promise<void> {
    // DB polling workers pick up jobs without a queue wake signal.
  }
}

let localInstance: LocalJobQueue | null = null;

export function getLocalJobQueue(): LocalJobQueue {
  if (!localInstance) localInstance = new LocalJobQueue();
  return localInstance;
}

export async function createLocalWakeSignal(
  _scope: JobQueueMessage["scope"],
  _onWake: () => void,
): Promise<() => void> {
  return () => {};
}

export function logLocalQueueFallback(reason: string): void {
  logger.warn("queue.fallback.local", { message: reason });
}
