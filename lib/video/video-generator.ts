import { randomUUID } from "crypto";
import { storage } from "@/lib/storage";
import { buildGeneratedVideoKey, buildVideoThumbnailKey } from "@/lib/storage/keys";
import { getVideoProvider } from "@/lib/video/provider-factory";
import { mapGeminiVideoError } from "@/lib/video/providers/gemini-veo";
import { categorizeVideoError, userFacingVideoMessage } from "@/lib/video/errors";
import { videoLogger } from "@/lib/video/logger";
import type { VideoConfiguration } from "@/types/video";
import type { VideoProviderInput } from "@/lib/video/providers/types";

export interface GenerateVideoUnitInput {
  userId: string;
  videoId: string;
  prompt: string;
  negativePrompt?: string;
  sourceStorageKey: string;
  configuration: VideoConfiguration;
}

export interface GenerateVideoUnitResult {
  storageKey: string;
  thumbnailStorageKey: string | null;
  provider: string;
  model: string;
  providerJobId: string | null;
}

export async function generateSingleVideo(
  input: GenerateVideoUnitInput,
): Promise<GenerateVideoUnitResult> {
  const sourceBuffer = await storage.readFile(input.sourceStorageKey);
  const sourceMimeType = guessMimeType(input.sourceStorageKey);

  const providerInput: VideoProviderInput = {
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    sourceImageBuffer: sourceBuffer,
    sourceMimeType,
    duration: input.configuration.duration,
    aspectRatio: input.configuration.aspectRatio,
    resolution: input.configuration.resolution,
  };

  try {
    const provider = getVideoProvider();
    const geminiProvider = provider as import("@/lib/video/providers/gemini-veo").GeminiVeoVideoProvider;
    const result = await geminiProvider.generateAndWait(providerInput);

    if (result.error || !result.videoBuffer) {
      throw new Error(result.error ?? "Video generation failed.");
    }

    const videoKey = buildGeneratedVideoKey(input.userId, input.videoId, "mp4");
    await storage.upload(result.videoBuffer, "video.mp4", {
      key: videoKey,
      contentType: result.videoMimeType ?? "video/mp4",
    });

    let thumbnailKey: string | null = null;
    try {
      thumbnailKey = buildVideoThumbnailKey(input.userId, input.videoId);
      await storage.upload(sourceBuffer, "thumbnail.jpg", {
        key: thumbnailKey,
        contentType: sourceMimeType.startsWith("image/") ? sourceMimeType : "image/jpeg",
      });
    } catch (thumbError) {
      videoLogger.warn("Unable to store video thumbnail", {
        videoId: input.videoId,
        error: thumbError instanceof Error ? thumbError.message : String(thumbError),
      });
    }

    return {
      storageKey: videoKey,
      thumbnailStorageKey: thumbnailKey,
      provider: provider.id,
      model: provider.model,
      providerJobId: null,
    };
  } catch (error) {
    const category = categorizeVideoError(error);
    const message = mapGeminiVideoError(error);
    videoLogger.error("Video generation failed", {
      videoId: input.videoId,
      category,
      message,
    });
    throw new Error(userFacingVideoMessage(category));
  }
}

function guessMimeType(storageKey: string): string {
  const ext = storageKey.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function createPlaceholderThumbnailKey(userId: string, videoId: string): string {
  return buildVideoThumbnailKey(userId, videoId);
}

export { randomUUID };
