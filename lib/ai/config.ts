export type ImageProviderId = "gemini" | "stub";

export interface ImageProviderConfig {
  defaultProvider: ImageProviderId;
  geminiApiKey?: string;
  geminiModel: string;
  maxImagesPerRequest: number;
  defaultImageCount: number;
}

export function getImageProviderConfig(): ImageProviderConfig {
  const defaultProvider = (process.env.DEFAULT_IMAGE_PROVIDER ?? "gemini") as ImageProviderId;

  return {
    defaultProvider,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image",
    maxImagesPerRequest: 6,
    defaultImageCount: 4,
  };
}

export function assertGeminiConfigured(): void {
  const config = getImageProviderConfig();
  if (!config.geminiApiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
}
