import { createGracefulWorker } from "@/lib/workers/graceful-shutdown";
import { videoWorker } from "../lib/video/worker";
import { getVideoWorkerPollMs } from "../lib/video/config";

createGracefulWorker({
  name: "video-worker",
  scope: "video",
  pollMs: getVideoWorkerPollMs(),
  processNext: () => videoWorker.processNextQueued(`video-worker-${process.pid}`),
});
