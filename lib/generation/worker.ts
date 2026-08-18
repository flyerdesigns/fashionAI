import type { GenerationImageJob, GenerationJob } from "@/types/generation-job";
import { toAIClothingReference } from "@/types";
import { productService } from "@/lib/products";
import { photoshootRepository } from "@/lib/photoshoot/repository";
import type { GeneratedImageAsset } from "@/lib/ai/generation-orchestrator";
import { generationJobRepository } from "@/lib/generation/repository";
import { generateSingleImage } from "@/lib/generation/image-generator";
import {
  calculateJobStatus,
  calculateProgress,
  mapJobStatusToPhotoshoot,
} from "@/lib/generation/service";
import { settleCreditsForJob } from "@/lib/generation/credits-integration";
import { generationLogger } from "@/lib/generation/logger";

const TERMINAL_JOB_STATUSES = new Set(["completed", "failed", "partially_failed", "cancelled"]);

export class GenerationWorker {
  private processingJobs = new Set<string>();

  async process(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) return;

    const job = await generationJobRepository.findById(jobId);
    if (!job) {
      generationLogger.warn("Job not found", { jobId });
      return;
    }

    if (TERMINAL_JOB_STATUSES.has(job.status)) return;

    this.processingJobs.add(jobId);

    try {
      await this.runJob(job);
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  async processNextQueued(workerId = "generation-worker"): Promise<boolean> {
    const candidate = await generationJobRepository.claimNextJob(workerId);
    if (!candidate) return false;
    await this.process(candidate.id);
    return true;
  }

  private async runJob(initialJob: GenerationJob): Promise<void> {
    let job = initialJob;

    if (job.status === "queued") {
      job =
        (await generationJobRepository.update(job.id, {
          status: "processing",
          startedAt: job.startedAt ?? new Date().toISOString(),
        })) ?? job;

      await photoshootRepository.update(job.photoshootId, { status: "processing" });

      generationLogger.info("Started processing job", {
        jobId: job.id,
        photoshootId: job.photoshootId,
        status: "processing",
      });
    }

    const product = await productService.getProductInternal(job.productId);
    if (!product || product.userId !== job.userId) {
      await this.failJob(job, "Product not found.");
      return;
    }

    const photoshoot = await photoshootRepository.findById(job.photoshootId);
    if (!photoshoot) {
      await this.failJob(job, "Photoshoot not found.");
      return;
    }

    const clothing = toAIClothingReference(product);
    const images = [...job.images];

    for (let i = 0; i < images.length; i++) {
      const currentJob = await generationJobRepository.findById(job.id);
      if (!currentJob || currentJob.status === "cancelled") {
        await settleCreditsForJob(currentJob ?? job);
        generationLogger.info("Job cancelled — stopping worker", {
          jobId: job.id,
          status: "cancelled",
        });
        return;
      }

      const imageJob = images[i];
      if (imageJob.status !== "queued") continue;

      const startedAt = new Date().toISOString();
      images[i] = { ...imageJob, status: "generating", startedAt };
      job = await this.persistJobProgress(job.id, images);

      generationLogger.info("Generating image", {
        jobId: job.id,
        imageJobId: imageJob.id,
        pose: imageJob.poseName,
        status: "generating",
      });

      const genStart = Date.now();
      const result = await generateSingleImage({
        clothing,
        clothingStorageKey: product.storageKey,
        clothingMimeType: product.mimeType,
        configuration: photoshoot.configuration,
        poseId: imageJob.poseId,
        userId: job.userId,
        photoshootId: job.photoshootId,
        existingAssetId: imageJob.imageAssetId ?? undefined,
      });

      const durationMs = Date.now() - genStart;

      if (result.errorCategory) {
        images[i] = {
          ...images[i],
          status: "failed",
          error: result.errorMessage ?? "Generation failed.",
          errorCategory: result.errorCategory,
          completedAt: new Date().toISOString(),
        };

        generationLogger.error("Image generation failed", {
          jobId: job.id,
          imageJobId: imageJob.id,
          pose: imageJob.poseName,
          status: "failed",
          durationMs,
          errorCategory: result.errorCategory,
        });
      } else {
        images[i] = {
          ...images[i],
          status: "completed",
          imageUrl: result.asset.imageUrl,
          storageKey: result.asset.storageKey,
          imageAssetId: result.asset.id,
          completedAt: new Date().toISOString(),
          error: null,
          errorCategory: null,
        };

        await this.syncPhotoshootImage(job, result.asset, imageJob);

        generationLogger.info("Image generation completed", {
          jobId: job.id,
          imageJobId: imageJob.id,
          pose: imageJob.poseName,
          status: "completed",
          durationMs,
        });
      }

      job = await this.persistJobProgress(job.id, images);
    }

    await this.finalizeJob(job.id);
  }

  private async persistJobProgress(jobId: string, images: GenerationImageJob[]) {
    const completedImages = images.filter((img) => img.status === "completed").length;
    const failedImages = images.filter((img) => img.status === "failed").length;
    const generating = images.find((img) => img.status === "generating");

    const updated =
      (await generationJobRepository.update(jobId, {
        images,
        completedImages,
        failedImages,
        currentImage: generating?.index ?? null,
        progress: calculateProgress(completedImages, failedImages, images.length),
      })) ?? null;

    if (!updated) throw new Error(`Job ${jobId} not found during progress update`);

    const photoshoot = await photoshootRepository.findById(updated.photoshootId);
    if (photoshoot) {
      await photoshootRepository.update(updated.photoshootId, {
        completedImages,
        totalImages: updated.totalImages,
        status: mapJobStatusToPhotoshoot(
          calculateJobStatus(completedImages, failedImages, updated.totalImages, false),
        ),
      });
    }

    return updated;
  }

  private async syncPhotoshootImage(
    job: GenerationJob,
    asset: GeneratedImageAsset,
    imageJob: GenerationImageJob,
  ) {
    const photoshoot = await photoshootRepository.findById(job.photoshootId);
    if (!photoshoot) return;

    const assetWithId = { ...asset, id: imageJob.imageAssetId ?? asset.id };

    if (job.type === "regenerate" || job.type === "retry_failed") {
      const exists = photoshoot.images.some((img) => img.id === assetWithId.id);
      const images = exists
        ? photoshoot.images.map((img) => (img.id === assetWithId.id ? assetWithId : img))
        : [...photoshoot.images, assetWithId];

      await photoshootRepository.update(photoshoot.id, {
        images,
        completedImages: images.length,
      });
      return;
    }

    const exists = photoshoot.images.some((img) => img.id === assetWithId.id);
    const images = exists
      ? photoshoot.images.map((img) => (img.id === assetWithId.id ? assetWithId : img))
      : [...photoshoot.images, assetWithId];

    await photoshootRepository.update(photoshoot.id, {
      images,
      completedImages: images.filter((img) => img.imageUrl).length,
    });
  }

  private async finalizeJob(jobId: string) {
    const job = await generationJobRepository.findById(jobId);
    if (!job) return;

    if (job.status === "cancelled") return;

    const cancelledCount = job.images.filter((img) => img.status === "cancelled").length;
    const isCancelled = cancelledCount > 0 && cancelledCount === job.totalImages;

    const finalStatus = calculateJobStatus(
      job.completedImages,
      job.failedImages,
      job.totalImages,
      isCancelled,
    );

    const error =
      finalStatus === "failed"
        ? "Photoshoot generation failed."
        : finalStatus === "partially_failed"
          ? `${job.failedImages} of ${job.totalImages} photos failed to generate.`
          : null;

    await generationJobRepository.update(jobId, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      error,
      progress: 100,
      currentImage: null,
    });

    await photoshootRepository.update(job.photoshootId, {
      status: mapJobStatusToPhotoshoot(finalStatus),
      completedImages: job.completedImages,
      totalImages: job.totalImages,
      generationJobId: jobId,
    });

    const finalJob = await generationJobRepository.findById(jobId);
    if (finalJob) {
      await settleCreditsForJob(finalJob);
    }

    generationLogger.info("Job finalized", {
      jobId,
      photoshootId: job.photoshootId,
      status: finalStatus,
    });
  }

  private async failJob(job: GenerationJob, message: string) {
    await generationJobRepository.update(job.id, {
      status: "failed",
      error: message,
      completedAt: new Date().toISOString(),
    });
    await photoshootRepository.update(job.photoshootId, {
      status: "failed",
    });
    const failedJob = await generationJobRepository.findById(job.id);
    if (failedJob) {
      await settleCreditsForJob(failedJob);
    }
    generationLogger.error("Job failed", {
      jobId: job.id,
      photoshootId: job.photoshootId,
      status: "failed",
      message,
    });
  }
}

export const generationWorker = new GenerationWorker();
