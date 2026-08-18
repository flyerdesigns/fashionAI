import { randomUUID } from "crypto";
import { productService } from "@/lib/products";
import { photoshootRepository } from "@/lib/photoshoot/repository";
import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { getVideoGenerationCost } from "@/lib/credits/config";
import { buildVideoNegativePrompt, buildVideoPrompt } from "@/lib/video/prompt-builder";
import { videoRepository } from "@/lib/video";
import {
  assertSufficientVideoCredits,
  getDefaultVideoProvider,
  releaseCreditsForVideoJob,
  reserveCreditsForVideoJob,
} from "@/lib/video/credits-integration";
import { VideoServiceError, categorizeVideoError, userFacingVideoMessage } from "@/lib/video/errors";
import { isVideoProviderConfigured } from "@/lib/video/config";
import { getProgressMessage } from "@/lib/video/prompt-builder";
import { InsufficientCreditsError } from "@/lib/credits";
import type {
  CreateVideoJobResponse,
  VideoConfiguration,
  VideoJobStatusResponse,
  VideoListFilters,
  VideoRecord,
  VideoSourceType,
} from "@/types/video";
import { DEFAULT_VIDEO_CONFIGURATION } from "@/lib/video/presets";
import { canUserAccessAsset } from "@/lib/assets/authorization";
import { notifyJobQueued } from "@/lib/queue";

export interface CreateVideoJobInput {
  title: string;
  sourceType: VideoSourceType;
  sourceStorageKey: string;
  sourceImageId?: string;
  productId?: string;
  photoshootId?: string;
  configuration?: Partial<VideoConfiguration>;
  requestId?: string;
}

export class VideoService {
  async createVideoJob(userId: string, input: CreateVideoJobInput): Promise<CreateVideoJobResponse> {
    if (!isPostgresEnabled()) {
      throw new VideoServiceError(
        "Video generation requires PostgreSQL.",
        503,
        "configuration_error",
      );
    }

    if (!isVideoProviderConfigured()) {
      throw new VideoServiceError(
        "Video generation provider is not configured.",
        503,
        "configuration_error",
      );
    }

    if (input.requestId) {
      const existing = await videoRepository.findActiveJobByRequestId(input.requestId);
      if (existing) {
        if (existing.userId !== userId) {
          throw new VideoServiceError("Video job not found.", 404, "invalid_request");
        }
        return {
          jobId: existing.id,
          videoId: existing.videoId,
          status: existing.status,
          estimatedCredits: getVideoGenerationCost(
            (await videoRepository.findVideoById(existing.videoId))?.duration ?? 5,
          ),
        };
      }
    }

    await this.validateSourceOwnership(userId, input);

    const configuration: VideoConfiguration = {
      ...DEFAULT_VIDEO_CONFIGURATION,
      ...input.configuration,
      motion: { ...DEFAULT_VIDEO_CONFIGURATION.motion, ...input.configuration?.motion },
      camera: { ...DEFAULT_VIDEO_CONFIGURATION.camera, ...input.configuration?.camera },
    };

    const prompt = buildVideoPrompt(configuration);
    const negativePrompt = buildVideoNegativePrompt(configuration);
    const estimatedCredits = await assertSufficientVideoCredits(userId, configuration.duration);

    const videoId = randomUUID();
    const jobId = randomUUID();
    const provider = getDefaultVideoProvider();

    const video = await videoRepository.createVideo(
      {
        userId,
        productId: input.productId ?? null,
        photoshootId: input.photoshootId ?? null,
        sourceImageId: input.sourceImageId ?? null,
        sourceType: input.sourceType,
        sourceStorageKey: input.sourceStorageKey,
        title: input.title.trim() || "Untitled Fashion Video",
        status: "queued",
        videoType: configuration.videoType,
        provider,
        providerJobId: null,
        prompt,
        negativePrompt,
        duration: configuration.duration,
        aspectRatio: configuration.aspectRatio,
        resolution: configuration.resolution,
        motionPreset: configuration.motion.motionIntensity,
        cameraMovement: configuration.motion.cameraMovement,
        videoStyle: configuration.style,
        configuration,
        storageKey: null,
        thumbnailStorageKey: null,
        creditsUsed: 0,
        errorCode: null,
        errorMessage: null,
        completedAt: null,
      },
      { id: videoId },
    );

    try {
      const job = await videoRepository.createJob(
        {
          userId,
          videoId: video.id,
          status: "queued",
          provider,
          providerJobId: null,
          progress: 0,
          requestId: input.requestId ?? null,
          attempts: 0,
          errorCode: null,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
        },
        { id: jobId },
      );

      await reserveCreditsForVideoJob(userId, job.id, configuration.duration);

      await notifyJobQueued("video", job.id);

      return {
        jobId: job.id,
        videoId: video.id,
        status: job.status,
        estimatedCredits,
      };
    } catch (error) {
      await videoRepository.updateVideo(video.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unable to create video job.",
      });
      throw error;
    }
  }

  async getJobStatusForUser(jobId: string, userId: string): Promise<VideoJobStatusResponse> {
    const job = await videoRepository.findJobByIdForUser(jobId, userId);
    if (!job) {
      throw new VideoServiceError("Video job not found.", 404, "invalid_request");
    }

    const video = await videoRepository.findVideoByIdForUser(job.videoId, userId);

    return {
      jobId: job.id,
      videoId: job.videoId,
      status: job.status,
      progress: job.progress,
      progressMessage: getProgressMessage(job.status, job.progress),
      video,
      error: job.errorMessage,
      errorCategory: job.errorCode as VideoJobStatusResponse["errorCategory"],
    };
  }

  async getVideoForUser(videoId: string, userId: string): Promise<VideoRecord> {
    const video = await videoRepository.findVideoByIdForUser(videoId, userId);
    if (!video) {
      throw new VideoServiceError("Video not found.", 404, "invalid_request");
    }
    return video;
  }

  async listVideos(userId: string, filters?: VideoListFilters) {
    if (!isPostgresEnabled()) return { items: [], total: 0 };
    return videoRepository.listVideosForUser(userId, filters);
  }

  async deleteVideo(videoId: string, userId: string): Promise<void> {
    const deleted = await videoRepository.deleteVideo(videoId, userId);
    if (!deleted) {
      throw new VideoServiceError("Video not found.", 404, "invalid_request");
    }
  }

  async cancelJob(jobId: string, userId: string): Promise<VideoJobStatusResponse> {
    const job = await videoRepository.findJobByIdForUser(jobId, userId);
    if (!job) {
      throw new VideoServiceError("Video job not found.", 404, "invalid_request");
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return this.getJobStatusForUser(jobId, userId);
    }

    await videoRepository.updateJob(jobId, {
      status: "cancelled",
      progress: job.progress,
      completedAt: new Date().toISOString(),
      errorCode: "cancelled",
      errorMessage: "Cancelled by user",
    });

    await videoRepository.updateVideo(job.videoId, {
      status: "cancelled",
      errorCode: "cancelled",
      errorMessage: "Cancelled by user",
      completedAt: new Date().toISOString(),
    });

    await releaseCreditsForVideoJob(jobId);
    return this.getJobStatusForUser(jobId, userId);
  }

  async retryJob(jobId: string, userId: string): Promise<CreateVideoJobResponse> {
    const job = await videoRepository.findJobByIdForUser(jobId, userId);
    if (!job) {
      throw new VideoServiceError("Video job not found.", 404, "invalid_request");
    }

    const video = await this.getVideoForUser(job.videoId, userId);
    if (video.status !== "failed" && video.status !== "cancelled") {
      throw new VideoServiceError("Only failed videos can be retried.", 400, "invalid_request");
    }

    return this.createVideoJob(userId, {
      title: video.title,
      sourceType: video.sourceType,
      sourceStorageKey: video.sourceStorageKey!,
      sourceImageId: video.sourceImageId ?? undefined,
      productId: video.productId ?? undefined,
      photoshootId: video.photoshootId ?? undefined,
      configuration: video.configuration,
      requestId: randomUUID(),
    });
  }

  async countVideosForUser(userId: string): Promise<number> {
    if (!isPostgresEnabled()) return 0;
    return videoRepository.countVideosForUser(userId);
  }

  async listRecentVideos(userId: string, limit = 4): Promise<VideoRecord[]> {
    const result = await this.listVideos(userId, { limit, sort: "newest" });
    return result.items;
  }

  private async validateSourceOwnership(userId: string, input: CreateVideoJobInput): Promise<void> {
    if (!input.sourceStorageKey?.trim()) {
      throw new VideoServiceError("Source image is required.", 400, "invalid_request");
    }

    if (input.productId) {
      const product = await productService.getProductForUser(input.productId, userId);
      if (!product) {
        throw new VideoServiceError("Product not found.", 404, "invalid_request");
      }
      if (input.sourceType === "product" && product.storageKey !== input.sourceStorageKey) {
        throw new VideoServiceError("Invalid product source image.", 400, "invalid_request");
      }
    }

    if (input.photoshootId) {
      const photoshoot = await photoshootRepository.findByIdForUser(input.photoshootId, userId);
      if (!photoshoot) {
        throw new VideoServiceError("Photoshoot not found.", 404, "invalid_request");
      }

      const imageKeys = photoshoot.images
        .map((img) => img.storageKey)
        .filter((key): key is string => !!key);

      if (
        (input.sourceType === "photoshoot" || input.sourceType === "generated_image") &&
        !imageKeys.includes(input.sourceStorageKey) &&
        photoshoot.clothingThumbnailUrl &&
        !input.sourceStorageKey.includes(photoshoot.productId)
      ) {
        const product = await productService.getProductForUser(photoshoot.productId, userId);
        if (product?.storageKey !== input.sourceStorageKey && !imageKeys.includes(input.sourceStorageKey)) {
          throw new VideoServiceError("Invalid photoshoot source image.", 400, "invalid_request");
        }
      }
    }

    if (input.sourceType === "generated_image" && input.sourceImageId) {
      const image = await prisma.generationImage.findFirst({
        where: {
          OR: [{ id: input.sourceImageId }, { imageAssetId: input.sourceImageId }],
          photoshoot: { userId },
        },
      });
      if (!image?.storageKey || image.storageKey !== input.sourceStorageKey) {
        throw new VideoServiceError("Generated image not found.", 404, "invalid_request");
      }
      return;
    }

    const ownsSource = await canUserAccessAsset(input.sourceStorageKey, userId);
    if (!ownsSource) {
      throw new VideoServiceError("Source image not found.", 404, "invalid_request");
    }
  }
}

export const videoService = new VideoService();

export function mapVideoServiceError(error: unknown): VideoServiceError {
  if (error instanceof VideoServiceError) return error;
  if (error instanceof InsufficientCreditsError) {
    return new VideoServiceError(error.message, 402, "insufficient_credits");
  }
  const category = categorizeVideoError(error);
  return new VideoServiceError(userFacingVideoMessage(category), 500, category);
}
