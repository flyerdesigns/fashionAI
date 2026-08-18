import type { PhotoshootConfiguration } from "@/types/photoshoot-config";
import type {
  CreateGenerationJobResponse,
  GenerationJobStatusResponse,
} from "@/types/generation-job";
import { USER_FACING_GENERATION_ERROR } from "@/lib/generation/errors";

export interface StartGenerationPayload {
  productId: string;
  configuration: PhotoshootConfiguration;
  numberOfImages?: number;
  requestId?: string;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const TERMINAL_STATUSES = new Set([
  "completed",
  "partially_failed",
  "failed",
  "cancelled",
]);

export async function startPhotoshootGeneration(
  payload: StartGenerationPayload,
): Promise<CreateGenerationJobResponse> {
  const response = await fetch("/api/generate/photoshoot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as CreateGenerationJobResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? USER_FACING_GENERATION_ERROR);
  }

  return data;
}

export async function fetchJobStatus(jobId: string): Promise<GenerationJobStatusResponse> {
  const response = await fetch(`/api/generation/${jobId}`);
  const data = (await response.json()) as GenerationJobStatusResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load generation status.");
  }
  return data;
}

export async function cancelGenerationJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/generation/${jobId}/cancel`, { method: "POST" });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Unable to cancel generation.");
  }
}

export async function retryFailedImages(
  photoshootId: string,
  requestId?: string,
): Promise<CreateGenerationJobResponse> {
  const response = await fetch(`/api/photoshoots/${photoshootId}/retry-failed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  });

  const data = (await response.json()) as CreateGenerationJobResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? USER_FACING_GENERATION_ERROR);
  }
  return data;
}

export async function startRegenerateJob(
  photoshootId: string,
  imageId: string,
  requestId?: string,
): Promise<CreateGenerationJobResponse> {
  const response = await fetch("/api/generate/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoshootId, imageId, requestId }),
  });

  const data = (await response.json()) as CreateGenerationJobResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? USER_FACING_GENERATION_ERROR);
  }
  return data;
}

export function pollJobStatus(
  jobId: string,
  onUpdate: (status: GenerationJobStatusResponse) => void,
  options?: { intervalMs?: number; timeoutMs?: number },
): { stop: () => void; promise: Promise<GenerationJobStatusResponse> } {
  const intervalMs = options?.intervalMs ?? POLL_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs ?? POLL_TIMEOUT_MS;
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const promise = new Promise<GenerationJobStatusResponse>((resolve, reject) => {
    const startedAt = Date.now();

    const poll = async () => {
      if (stopped) return;

      if (Date.now() - startedAt > timeoutMs) {
        stopped = true;
        if (timer) clearInterval(timer);
        reject(new Error("Generation timed out. Please check your photoshoot library."));
        return;
      }

      try {
        const status = await fetchJobStatus(jobId);
        onUpdate(status);

        if (TERMINAL_STATUSES.has(status.status)) {
          stopped = true;
          if (timer) clearInterval(timer);
          resolve(status);
        }
      } catch (error) {
        stopped = true;
        if (timer) clearInterval(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    void poll();
    timer = setInterval(() => void poll(), intervalMs);
  });

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
    },
    promise,
  };
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function getProgressMessage(status: GenerationJobStatusResponse): string {
  if (status.status === "queued") return "Preparing garment...";
  if (status.status === "processing") {
    const current = status.completedImages + status.failedImages + 1;
    const clamped = Math.min(current, status.totalImages);
    return `Generating image ${clamped} of ${status.totalImages}...`;
  }
  if (status.status === "completed") return "Finalizing photoshoot...";
  if (status.status === "partially_failed") return "Finalizing photoshoot...";
  if (status.status === "failed") return "Generation failed.";
  if (status.status === "cancelled") return "Generation cancelled.";
  return "Creating your fashion photoshoot...";
}
