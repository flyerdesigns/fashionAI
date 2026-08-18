export type JobQueueScope = "image" | "video";

export interface JobQueueMessage {
  scope: JobQueueScope;
  jobId: string;
}

export interface JobQueue {
  enqueue(message: JobQueueMessage): Promise<void>;
  createWakeSignal?(scope: JobQueueScope, onWake: () => void): Promise<() => void>;
}
