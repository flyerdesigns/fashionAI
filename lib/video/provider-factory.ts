import { getVideoProviderId, isVideoProviderConfigured } from "@/lib/video/config";
import type { VideoGenerationProvider } from "./providers/types";
import { GeminiVeoVideoProvider } from "./providers/gemini-veo";

let cachedProvider: VideoGenerationProvider | null = null;

export function getVideoProvider(): VideoGenerationProvider {
  if (!isVideoProviderConfigured()) {
    throw new Error("Video generation provider is not configured.");
  }

  if (cachedProvider) return cachedProvider;

  const providerId = getVideoProviderId();
  switch (providerId) {
    case "gemini_veo":
    default:
      cachedProvider = new GeminiVeoVideoProvider();
      return cachedProvider;
  }
}

export function resetVideoProviderCache(): void {
  cachedProvider = null;
}
