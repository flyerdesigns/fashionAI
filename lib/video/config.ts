function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getVideoProviderId(): string {
  return process.env.VIDEO_PROVIDER?.trim() || "gemini_veo";
}

export function getVideoProviderApiKey(): string | null {
  const dedicated = process.env.VIDEO_PROVIDER_API_KEY?.trim();
  if (dedicated) return dedicated;
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function getGeminiVideoModel(): string {
  return process.env.GEMINI_VIDEO_MODEL?.trim() || "veo-2.0-generate-001";
}

export function getVideoGenerationTimeoutMs(): number {
  return readInt("VIDEO_GENERATION_TIMEOUT_MS", 600_000);
}

export function getVideoWorkerPollMs(): number {
  return readInt("VIDEO_WORKER_POLL_MS", 3000);
}

export function getVideoProviderPollMs(): number {
  return readInt("VIDEO_PROVIDER_POLL_MS", 10_000);
}

export function getVideoMaxAttempts(): number {
  return readInt("VIDEO_MAX_ATTEMPTS", 2);
}

export function isVideoProviderConfigured(): boolean {
  return !!getVideoProviderApiKey();
}

export function getCreditsForVideoDuration(duration: 5 | 10 | 15): number {
  switch (duration) {
    case 10:
      return readInt("CREDITS_VIDEO_10_SEC", 40);
    case 15:
      return readInt("CREDITS_VIDEO_15_SEC", 60);
    case 5:
    default:
      return readInt("CREDITS_VIDEO_5_SEC", 25);
  }
}
