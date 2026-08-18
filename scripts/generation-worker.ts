import { createGracefulWorker } from "@/lib/workers/graceful-shutdown";
import { generationWorker } from "../lib/generation/worker";
import { getGenerationConfig } from "../lib/generation/config";

const { workerPollIntervalMs } = getGenerationConfig();

createGracefulWorker({
  name: "generation-worker",
  scope: "image",
  pollMs: workerPollIntervalMs,
  processNext: () => generationWorker.processNextQueued(`generation-worker-${process.pid}`),
});
