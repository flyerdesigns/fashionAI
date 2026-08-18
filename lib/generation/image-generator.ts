import { randomUUID } from "crypto";
import type { AIClothingReference } from "@/types/clothing";
import type { PhotoshootConfiguration, PoseId } from "@/types/photoshoot-config";
import { buildPosePrompt } from "@/lib/ai/prompt-builder";
import { getImageProvider } from "@/lib/ai/provider-factory";
import { storage, buildGeneratedImageKey } from "@/lib/storage";
import { getPoseLabel } from "@/lib/mock/pose-presets";
import type { GeneratedImageAsset } from "@/lib/ai/generation-orchestrator";
import { getGenerationConfig, withTimeout } from "@/lib/generation/config";
import {
  categorizeProviderError,
  userFacingMessage,
} from "@/lib/generation/errors";
import type { GenerationErrorCategory } from "@/types/generation-job";

export interface GenerateSingleImageInput {
  clothing: AIClothingReference;
  clothingStorageKey: string;
  clothingMimeType: string;
  configuration: PhotoshootConfiguration;
  poseId: PoseId;
  userId: string;
  photoshootId: string;
  existingAssetId?: string;
}

export interface GenerateSingleImageResult {
  asset: GeneratedImageAsset;
  errorCategory?: GenerationErrorCategory;
  errorMessage?: string;
}

export async function generateSingleImage(
  input: GenerateSingleImageInput,
): Promise<GenerateSingleImageResult> {
  const provider = getImageProvider();
  const { imageTimeoutMs } = getGenerationConfig();

  try {
    const clothingBuffer = await storage.readFile(input.clothingStorageKey);
    const clothingBase64 = clothingBuffer.toString("base64");
    const prompt = buildPosePrompt(input.clothing, input.configuration, input.poseId);

    const result = await withTimeout(
      provider.generateImage({
        prompt: prompt.fullPrompt,
        clothingImageBase64: clothingBase64,
        clothingMimeType: input.clothingMimeType,
        aspectRatio: input.configuration.aspectRatio,
      }),
      imageTimeoutMs,
      "Image generation timed out",
    );

    const imageAssetId = input.existingAssetId ?? randomUUID();
    const storageKey = buildGeneratedImageKey(
      input.userId,
      input.photoshootId,
      imageAssetId,
      "png",
    );

    const stored = await storage.upload(
      result.imageBuffer,
      `${imageAssetId}.png`,
      { key: storageKey, contentType: result.mimeType },
    );

    return {
      asset: {
        id: imageAssetId,
        poseId: input.poseId,
        poseLabel: getPoseLabel(input.poseId),
        imageUrl: stored.url,
        storageKey: stored.key,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const category = categorizeProviderError(error);
    return {
      asset: {
        id: input.existingAssetId ?? randomUUID(),
        poseId: input.poseId,
        poseLabel: getPoseLabel(input.poseId),
        imageUrl: "",
        storageKey: "",
        createdAt: new Date().toISOString(),
      },
      errorCategory: category,
      errorMessage: userFacingMessage(category),
    };
  }
}
