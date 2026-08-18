import { randomUUID } from "crypto";
import type { AIClothingReference } from "@/types/clothing";
import type { PhotoshootConfiguration, PoseId } from "@/types/photoshoot-config";
import type { PhotoshootStatus } from "@/types/photoshoot";
import { buildPosePrompt, resolveGenerationCount } from "@/lib/ai/prompt-builder";
import { getImageProvider } from "@/lib/ai/provider-factory";
import { mapGeminiError } from "@/lib/ai/providers/gemini-image";
import { getImageProviderConfig } from "@/lib/ai/config";
import { storage } from "@/lib/storage";
import { getPoseLabel } from "@/lib/mock/pose-presets";

export interface GeneratedImageAsset {
  id: string;
  poseId: PoseId;
  poseLabel: string;
  imageUrl: string;
  storageKey: string;
  createdAt: string;
}

export interface PhotoshootRecord {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  clothingThumbnailUrl: string;
  configuration: PhotoshootConfiguration;
  generationId: string;
  generationJobId: string | null;
  status: PhotoshootStatus;
  images: GeneratedImageAsset[];
  provider: string;
  totalImages: number;
  completedImages: number;
  createdAt: string;
  updatedAt: string;
}

export type GenerationProgressEvent =
  | { type: "status"; message: string }
  | { type: "complete"; result: GenerationJobResult }
  | { type: "error"; message: string };

export interface GenerationJobResult {
  generationId: string;
  photoshootId: string;
  status: PhotoshootStatus;
  imageUrls: string[];
  images: GeneratedImageAsset[];
  provider: string;
  createdAt: string;
}

export interface RunGenerationInput {
  productId: string;
  clothing: AIClothingReference;
  clothingStorageKey: string;
  clothingMimeType: string;
  configuration: PhotoshootConfiguration;
  numberOfImages?: number;
  onProgress?: (message: string) => void;
}

export interface RegenerateImageInput {
  photoshoot: PhotoshootRecord;
  poseId: PoseId;
  clothing: AIClothingReference;
  clothingStorageKey: string;
  clothingMimeType: string;
  onProgress?: (message: string) => void;
}

export class GenerationOrchestrator {
  async runPhotoshootGeneration(input: RunGenerationInput): Promise<GenerationJobResult> {
    const config = getImageProviderConfig();
    const provider = getImageProvider();

    input.onProgress?.("Preparing garment...");

    const clothingBuffer = await storage.readFile(input.clothingStorageKey);
    const clothingBase64 = clothingBuffer.toString("base64");

    const poses = input.configuration.poses;
    const imageCount = resolveGenerationCount(
      poses.length,
      input.numberOfImages,
      config.maxImagesPerRequest,
      config.defaultImageCount,
    );
    const posesToGenerate = poses.slice(0, imageCount);

    input.onProgress?.("Creating fashion scene...");

    const generationId = randomUUID();
    const generatedImages: GeneratedImageAsset[] = [];

    for (let i = 0; i < posesToGenerate.length; i++) {
      const poseId = posesToGenerate[i];
      input.onProgress?.(`Generating image ${i + 1} of ${posesToGenerate.length}...`);

      const prompt = buildPosePrompt(input.clothing, input.configuration, poseId);

      try {
        const result = await provider.generateImage({
          prompt: prompt.fullPrompt,
          clothingImageBase64: clothingBase64,
          clothingMimeType: input.clothingMimeType,
          aspectRatio: input.configuration.aspectRatio,
        });

        const stored = await storage.upload(
          result.imageBuffer,
          `${poseId}-${Date.now()}.png`,
          { folder: "generated", contentType: result.mimeType },
        );

        generatedImages.push({
          id: randomUUID(),
          poseId,
          poseLabel: getPoseLabel(poseId),
          imageUrl: stored.url,
          storageKey: stored.key,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Generation failed for pose ${poseId}:`, error instanceof Error ? error.message : error);
        throw new GenerationOrchestratorError(mapGeminiError(error));
      }
    }

    input.onProgress?.("Finalizing photos...");

    return {
      generationId,
      photoshootId: "",
      status: generatedImages.length > 0 ? "completed" : "failed",
      imageUrls: generatedImages.map((img) => img.imageUrl),
      images: generatedImages,
      provider: provider.id,
      createdAt: new Date().toISOString(),
    };
  }

  async regenerateSingleImage(input: RegenerateImageInput): Promise<GeneratedImageAsset> {
    const provider = getImageProvider();
    const { poseId, clothing } = input;

    input.onProgress?.("Preparing garment...");

    const clothingBuffer = await storage.readFile(input.clothingStorageKey);
    const clothingBase64 = clothingBuffer.toString("base64");

    input.onProgress?.(`Regenerating ${getPoseLabel(poseId)}...`);

    const prompt = buildPosePrompt(
      clothing,
      input.photoshoot.configuration,
      poseId,
    );

    try {
      const result = await provider.generateImage({
        prompt: prompt.fullPrompt,
        clothingImageBase64: clothingBase64,
        clothingMimeType: input.clothingMimeType,
        aspectRatio: input.photoshoot.configuration.aspectRatio,
      });

      const stored = await storage.upload(
        result.imageBuffer,
        `${poseId}-regen-${Date.now()}.png`,
        { folder: "generated", contentType: result.mimeType },
      );

      return {
        id: randomUUID(),
        poseId,
        poseLabel: getPoseLabel(poseId),
        imageUrl: stored.url,
        storageKey: stored.key,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Regeneration failed:", error instanceof Error ? error.message : error);
      throw new GenerationOrchestratorError(mapGeminiError(error));
    }
  }
}

export class GenerationOrchestratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationOrchestratorError";
  }
}

export const generationOrchestrator = new GenerationOrchestrator();
