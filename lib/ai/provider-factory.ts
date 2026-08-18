import type { ImageGenerationProvider } from "./providers/types";
import { GeminiImageProvider } from "./providers/gemini-image";
import { getImageProviderConfig, type ImageProviderId } from "@/lib/ai/config";

let geminiInstance: GeminiImageProvider | null = null;

export function getImageProvider(providerId?: ImageProviderId): ImageGenerationProvider {
  const id = providerId ?? getImageProviderConfig().defaultProvider;

  switch (id) {
    case "gemini":
      if (!geminiInstance) {
        geminiInstance = new GeminiImageProvider();
      }
      return geminiInstance;
    default:
      throw new Error(`Unknown image provider: ${id}`);
  }
}

export function resetProviderCache(): void {
  geminiInstance = null;
}
