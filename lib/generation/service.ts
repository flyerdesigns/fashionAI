import { randomUUID } from "crypto";
import type { PhotoshootConfiguration } from "@/types/photoshoot-config";
import type {
  CreateGenerationJobResponse,
  GenerationImageJob,
  GenerationJob,
  GenerationJobStatus,
} from "@/types/generation-job";
import { toAIClothingReference } from "@/types";
import { productService } from "@/lib/products";
import { validateCompleteConfig } from "@/lib/photoshoot/validate-config";
import { photoshootRepository } from "@/lib/photoshoot/repository";
import { getImageProviderConfig } from "@/lib/ai/config";
import { resolveGenerationCount } from "@/lib/ai/prompt-builder";
import { getPoseLabel } from "@/lib/mock/pose-presets";
import { generationJobRepository } from "@/lib/generation/repository";
import { GenerationServiceError } from "@/lib/generation/errors";
import { generationLogger } from "@/lib/generation/logger";
import {
  assertSufficientCredits,
  cleanupJobOnCreditFailure,
  reserveCreditsForJob,
  settleCreditsForJob,
} from "@/lib/generation/credits-integration";
import { InsufficientCreditsError } from "@/lib/credits";
import type { PoseId } from "@/types/photoshoot-config";
import type { PhotoshootStatus } from "@/types/photoshoot";
import { notifyJobQueued } from "@/lib/queue";

export interface CreatePhotoshootJobInput {
  productId: string;
  configuration: PhotoshootConfiguration;
  numberOfImages?: number;
  requestId?: string;
}

export interface CreateRegenerateJobInput {
  photoshootId: string;
  imageId: string;
  requestId?: string;
}

function calculateProgress(completed: number, failed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((completed + failed) / total) * 100);
}

function calculateJobStatus(
  completed: number,
  failed: number,
  total: number,
  cancelled: boolean,
): GenerationJobStatus {
  if (cancelled) return "cancelled";
  if (completed === 0 && failed === total) return "failed";
  if (completed + failed === total) {
    if (failed === 0) return "completed";
    if (completed === 0) return "failed";
    return "partially_failed";
  }
  if (completed > 0 || failed > 0) return "processing";
  return "queued";
}

function mapJobStatusToPhotoshoot(status: GenerationJobStatus): PhotoshootStatus {
  switch (status) {
    case "queued":
    case "processing":
      return "processing";
    case "completed":
      return "completed";
    case "partially_failed":
      return "partially_failed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "processing";
  }
}

function buildImageJobs(
  jobId: string,
  poses: PoseId[],
  existingAssets: { id: string; poseId: PoseId }[] = [],
): GenerationImageJob[] {
  return poses.map((poseId, index) => {
    const existing = existingAssets.find((a) => a.poseId === poseId);
    return {
      id: randomUUID(),
      jobId,
      poseId,
      poseName: getPoseLabel(poseId),
      index,
      status: "queued",
      imageUrl: null,
      storageKey: null,
      imageAssetId: existing?.id ?? randomUUID(),
      error: null,
      errorCategory: null,
      startedAt: null,
      completedAt: null,
    };
  });
}

export class GenerationService {
  async createPhotoshootJob(
    userId: string,
    input: CreatePhotoshootJobInput,
  ): Promise<CreateGenerationJobResponse> {
    if (input.requestId) {
      const existing = await generationJobRepository.findActiveByRequestId(input.requestId);
      if (existing) {
        if (existing.userId !== userId) {
          throw new GenerationServiceError("Generation job not found.", 404, "invalid_request");
        }
        generationLogger.info("Returning existing active job for idempotent request", {
          jobId: existing.id,
          photoshootId: existing.photoshootId,
        });
        return {
          jobId: existing.id,
          photoshootId: existing.photoshootId,
          status: existing.status,
        };
      }
    }

    const product = await productService.getProductForUser(input.productId, userId);
    if (!product) {
      throw new GenerationServiceError("Product not found.", 404, "invalid_request");
    }

    const clothing = toAIClothingReference(product);
    const validation = validateCompleteConfig({ clothing, config: input.configuration });
    if (!validation.valid) {
      throw new GenerationServiceError(
        validation.errors[0]?.message ?? "Invalid photoshoot configuration.",
        400,
        "invalid_request",
      );
    }

    const providerConfig = getImageProviderConfig();
    if (!providerConfig.geminiApiKey?.trim() && providerConfig.defaultProvider === "gemini") {
      throw new GenerationServiceError(
        "AI generation is not configured. Please set GEMINI_API_KEY.",
        503,
        "configuration_error",
      );
    }

    const imageCount = resolveGenerationCount(
      input.configuration.poses.length,
      input.numberOfImages,
      providerConfig.maxImagesPerRequest,
      providerConfig.defaultImageCount,
    );
    const poses = input.configuration.poses.slice(0, imageCount);

    await assertSufficientCredits(userId, poses.length, "photoshoot");

    const photoshoot = await photoshootRepository.create({
      userId,
      productId: product.id,
      productName: product.productName,
      clothingThumbnailUrl: product.imageUrl,
      configuration: input.configuration,
      generationId: randomUUID(),
      generationJobId: null,
      status: "processing",
      images: [],
      provider: providerConfig.defaultProvider,
      totalImages: poses.length,
      completedImages: 0,
    });

    const imageJobs = buildImageJobs("", poses);

    const job = await generationJobRepository.create({
      userId,
      photoshootId: photoshoot.id,
      productId: product.id,
      provider: providerConfig.defaultProvider,
      type: "photoshoot",
      status: "queued",
      requestId: input.requestId ?? null,
      totalImages: poses.length,
      completedImages: 0,
      failedImages: 0,
      currentImage: null,
      progress: 0,
      error: null,
      errorCategory: null,
      targetImageId: null,
      images: imageJobs.map((img) => ({ ...img, jobId: "" })),
      startedAt: null,
      completedAt: null,
    });

    const imagesWithJobId = imageJobs.map((img) => ({ ...img, jobId: job.id }));
    await generationJobRepository.update(job.id, { images: imagesWithJobId });
    await photoshootRepository.update(photoshoot.id, { generationJobId: job.id });

    try {
      await reserveCreditsForJob(userId, job.id, poses.length, "photoshoot");
    } catch (error) {
      await cleanupJobOnCreditFailure(job.id, photoshoot.id);
      if (error instanceof InsufficientCreditsError) {
        throw new GenerationServiceError(error.message, 402, "invalid_request");
      }
      throw error;
    }

    if (input.requestId) {
      await generationJobRepository.saveIdempotency({
        requestId: input.requestId,
        jobId: job.id,
        createdAt: new Date().toISOString(),
      });
    }

    generationLogger.info("Created photoshoot generation job", {
      jobId: job.id,
      photoshootId: photoshoot.id,
      status: "queued",
    });

    await notifyJobQueued("image", job.id);

    return { jobId: job.id, photoshootId: photoshoot.id, status: "queued" };
  }

  async createRegenerateJob(
    userId: string,
    input: CreateRegenerateJobInput,
  ): Promise<CreateGenerationJobResponse> {
    if (input.requestId) {
      const existing = await generationJobRepository.findActiveByRequestId(input.requestId);
      if (existing) {
        if (existing.userId !== userId) {
          throw new GenerationServiceError("Generation job not found.", 404, "invalid_request");
        }
        return {
          jobId: existing.id,
          photoshootId: existing.photoshootId,
          status: existing.status,
        };
      }
    }

    const photoshoot = await photoshootRepository.findByIdForUser(input.photoshootId, userId);
    if (!photoshoot) {
      throw new GenerationServiceError("Photoshoot not found.", 404, "invalid_request");
    }

    const existingImage = photoshoot.images.find((img) => img.id === input.imageId);
    if (!existingImage) {
      throw new GenerationServiceError("Image not found.", 404, "invalid_request");
    }

    const providerConfig = getImageProviderConfig();
    if (!providerConfig.geminiApiKey?.trim() && providerConfig.defaultProvider === "gemini") {
      throw new GenerationServiceError(
        "AI generation is not configured. Please set GEMINI_API_KEY.",
        503,
        "configuration_error",
      );
    }

    await assertSufficientCredits(userId, 1, "regenerate");

    const imageJob: GenerationImageJob = {
      id: randomUUID(),
      jobId: "",
      poseId: existingImage.poseId as PoseId,
      poseName: existingImage.poseLabel,
      index: 0,
      status: "queued",
      imageUrl: null,
      storageKey: null,
      imageAssetId: existingImage.id,
      error: null,
      errorCategory: null,
      startedAt: null,
      completedAt: null,
    };

    const job = await generationJobRepository.create({
      userId,
      photoshootId: photoshoot.id,
      productId: photoshoot.productId,
      provider: providerConfig.defaultProvider,
      type: "regenerate",
      status: "queued",
      requestId: input.requestId ?? null,
      totalImages: 1,
      completedImages: 0,
      failedImages: 0,
      currentImage: null,
      progress: 0,
      error: null,
      errorCategory: null,
      targetImageId: existingImage.id,
      images: [{ ...imageJob, jobId: "" }],
      startedAt: null,
      completedAt: null,
    });

    await generationJobRepository.update(job.id, {
      images: [{ ...imageJob, jobId: job.id }],
    });

    try {
      await reserveCreditsForJob(userId, job.id, 1, "regenerate");
    } catch (error) {
      await generationJobRepository.delete(job.id);
      if (error instanceof InsufficientCreditsError) {
        throw new GenerationServiceError(error.message, 402, "invalid_request");
      }
      throw error;
    }

    if (input.requestId) {
      await generationJobRepository.saveIdempotency({
        requestId: input.requestId,
        jobId: job.id,
        createdAt: new Date().toISOString(),
      });
    }

    generationLogger.info("Created regenerate job", {
      jobId: job.id,
      photoshootId: photoshoot.id,
    });

    await notifyJobQueued("image", job.id);

    return { jobId: job.id, photoshootId: photoshoot.id, status: "queued" };
  }

  async createRetryFailedJob(
    userId: string,
    photoshootId: string,
    requestId?: string,
  ): Promise<CreateGenerationJobResponse> {
    if (requestId) {
      const existing = await generationJobRepository.findActiveByRequestId(requestId);
      if (existing) {
        if (existing.userId !== userId) {
          throw new GenerationServiceError("Generation job not found.", 404, "invalid_request");
        }
        return {
          jobId: existing.id,
          photoshootId: existing.photoshootId,
          status: existing.status,
        };
      }
    }

    const photoshoot = await photoshootRepository.findByIdForUser(photoshootId, userId);
    if (!photoshoot) {
      throw new GenerationServiceError("Photoshoot not found.", 404, "invalid_request");
    }

    const jobs = await generationJobRepository.findAllByPhotoshootId(photoshootId);
    let failedImages: GenerationImageJob[] = [];
    for (const candidate of jobs) {
      const failed = candidate.images.filter((img) => img.status === "failed");
      if (failed.length > 0) {
        failedImages = failed;
        break;
      }
    }

    if (failedImages.length === 0) {
      throw new GenerationServiceError("No failed images to retry.", 400, "invalid_request");
    }

    const providerConfig = getImageProviderConfig();
    const retryImageJobs: GenerationImageJob[] = failedImages.map((img, index) => ({
      ...img,
      id: randomUUID(),
      status: "queued",
      imageUrl: null,
      storageKey: null,
      error: null,
      errorCategory: null,
      startedAt: null,
      completedAt: null,
      index,
    }));

    await assertSufficientCredits(userId, retryImageJobs.length, "retry_failed");

    const retryJob = await generationJobRepository.create({
      userId,
      photoshootId: photoshoot.id,
      productId: photoshoot.productId,
      provider: providerConfig.defaultProvider,
      type: "retry_failed",
      status: "queued",
      requestId: requestId ?? null,
      totalImages: retryImageJobs.length,
      completedImages: 0,
      failedImages: 0,
      currentImage: null,
      progress: 0,
      error: null,
      errorCategory: null,
      targetImageId: null,
      images: retryImageJobs.map((img) => ({ ...img, jobId: "" })),
      startedAt: null,
      completedAt: null,
    });

    await generationJobRepository.update(retryJob.id, {
      images: retryImageJobs.map((img) => ({ ...img, jobId: retryJob.id })),
    });

    await photoshootRepository.update(photoshoot.id, {
      status: "processing",
      generationJobId: retryJob.id,
    });

    try {
      await reserveCreditsForJob(
        userId,
        retryJob.id,
        retryImageJobs.length,
        "retry_failed",
      );
    } catch (error) {
      await generationJobRepository.delete(retryJob.id);
      if (error instanceof InsufficientCreditsError) {
        throw new GenerationServiceError(error.message, 402, "invalid_request");
      }
      throw error;
    }

    if (requestId) {
      await generationJobRepository.saveIdempotency({
        requestId,
        jobId: retryJob.id,
        createdAt: new Date().toISOString(),
      });
    }

    await notifyJobQueued("image", retryJob.id);

    return {
      jobId: retryJob.id,
      photoshootId: photoshoot.id,
      status: "queued",
    };
  }

  async getJobStatus(jobId: string, userId: string) {
    const job = await generationJobRepository.findByIdForUser(jobId, userId);
    if (!job) {
      throw new GenerationServiceError("Generation job not found.", 404, "invalid_request");
    }

    return {
      jobId: job.id,
      photoshootId: job.photoshootId,
      status: job.status,
      type: job.type,
      totalImages: job.totalImages,
      completedImages: job.completedImages,
      failedImages: job.failedImages,
      progress: job.progress,
      currentImage: job.currentImage,
      images: job.images,
      error: job.error,
    };
  }

  async cancelJob(jobId: string, userId: string): Promise<GenerationJob> {
    const job = await generationJobRepository.findByIdForUser(jobId, userId);
    if (!job) {
      throw new GenerationServiceError("Generation job not found.", 404, "invalid_request");
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      throw new GenerationServiceError("This generation job cannot be cancelled.", 400, "invalid_request");
    }

    const updatedImages = job.images.map((img) => {
      if (img.status === "queued") {
        return { ...img, status: "cancelled" as const };
      }
      return img;
    });

    const updated = await generationJobRepository.update(jobId, {
      status: "cancelled",
      images: updatedImages,
      completedAt: new Date().toISOString(),
      error: "Generation cancelled by user.",
    });

    if (!updated) {
      throw new GenerationServiceError("Unable to cancel job.", 500, "unknown_error");
    }

    await photoshootRepository.update(job.photoshootId, {
      status: "cancelled",
    });

    await settleCreditsForJob(updated);

    generationLogger.info("Cancelled generation job", {
      jobId,
      photoshootId: job.photoshootId,
      status: "cancelled",
    });

    return updated;
  }

  computeFinalStatus(job: GenerationJob): GenerationJobStatus {
    const cancelledImages = job.images.filter((img) => img.status === "cancelled").length;
    const isCancelled =
      job.status === "cancelled" || cancelledImages === job.totalImages;
    return calculateJobStatus(
      job.completedImages,
      job.failedImages,
      job.totalImages,
      isCancelled,
    );
  }

  mapJobStatusToPhotoshoot(status: GenerationJobStatus): PhotoshootStatus {
    return mapJobStatusToPhotoshoot(status);
  }

  recalculateJobMetrics(images: GenerationImageJob[]) {
    const completedImages = images.filter((img) => img.status === "completed").length;
    const failedImages = images.filter((img) => img.status === "failed").length;
    const generating = images.find((img) => img.status === "generating");
    const progress = calculateProgress(completedImages, failedImages, images.length);
    return {
      completedImages,
      failedImages,
      currentImage: generating?.index ?? null,
      progress,
    };
  }
}

export const generationService = new GenerationService();

export { calculateJobStatus, calculateProgress, mapJobStatusToPhotoshoot };
