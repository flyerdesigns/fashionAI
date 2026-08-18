import type { AspectRatio } from "@/types/photoshoot-config";

export interface ProviderImageInput {
  prompt: string;
  clothingImageBase64: string;
  clothingMimeType: string;
  aspectRatio: AspectRatio;
}

export interface ProviderImageResult {
  imageBuffer: Buffer;
  mimeType: string;
  provider: string;
  model: string;
}

export interface ImageGenerationProvider {
  readonly id: string;
  generateImage(input: ProviderImageInput): Promise<ProviderImageResult>;
}

const GEMINI_ASPECT_MAP: Record<AspectRatio, string> = {
  "1:1": "1:1",
  "4:5": "4:5",
  "3:4": "3:4",
  "9:16": "9:16",
  "16:9": "16:9",
};

export { GEMINI_ASPECT_MAP };
