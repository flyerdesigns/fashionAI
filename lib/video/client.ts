import type { VideoJobStatusResponse } from "@/types/video";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export async function fetchVideoJobStatus(jobId: string): Promise<VideoJobStatusResponse> {
  const response = await fetch(`/api/video/jobs/${jobId}`, { cache: "no-store" });
  const data = (await response.json()) as VideoJobStatusResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load video job status.");
  }
  return data;
}

export function pollVideoJobStatus(
  jobId: string,
  onUpdate: (status: VideoJobStatusResponse) => void,
  intervalMs = 3000,
): { promise: Promise<VideoJobStatusResponse>; stop: () => void } {
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };

  const promise = new Promise<VideoJobStatusResponse>((resolve, reject) => {
    const tick = async () => {
      if (stopped) return;
      try {
        const status = await fetchVideoJobStatus(jobId);
        onUpdate(status);
        if (TERMINAL.has(status.status)) {
          stop();
          resolve(status);
        }
      } catch (error) {
        stop();
        reject(error);
      }
    };

    void tick();
    timer = setInterval(() => void tick(), intervalMs);
  });

  return { promise, stop };
}

export async function cancelVideoJob(jobId: string): Promise<VideoJobStatusResponse> {
  const response = await fetch(`/api/video/jobs/${jobId}/cancel`, { method: "POST" });
  const data = (await response.json()) as VideoJobStatusResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to cancel video job.");
  }
  return data;
}

export async function createVideoJob(body: Record<string, unknown>): Promise<{
  jobId: string;
  videoId: string;
  status: string;
  estimatedCredits: number;
}> {
  const response = await fetch("/api/generate/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    jobId?: string;
    videoId?: string;
    status?: string;
    estimatedCredits?: number;
    error?: string;
  };
  if (!response.ok || !data.jobId || !data.videoId) {
    throw new Error(data.error ?? "Unable to start video generation.");
  }
  return {
    jobId: data.jobId,
    videoId: data.videoId,
    status: data.status ?? "queued",
    estimatedCredits: data.estimatedCredits ?? 0,
  };
}
