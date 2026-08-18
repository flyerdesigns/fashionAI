import { getVideoGenerationCost } from "@/lib/credits/config";
import { videoRepository } from "@/lib/video";
import {
  settleCreditsForVideoJob,
} from "@/lib/video/credits-integration";
import { categorizeVideoError, userFacingVideoMessage } from "@/lib/video/errors";
import { videoLogger } from "@/lib/video/logger";
import { getVideoMaxAttempts } from "@/lib/video/config";
import { generateSingleVideo } from "@/lib/video/video-generator";
import type { VideoGenerationJobRecord } from "@/types/video";

export class VideoWorker {
  private processingJobs = new Set<string>();

  async process(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) return;

    const job = await videoRepository.findJobById(jobId);
    if (!job) {
      videoLogger.warn("Video job not found", { jobId });
      return;
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return;
    }

    this.processingJobs.add(jobId);

    try {
      await this.runJob(job);
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  async processNextQueued(workerId = "video-worker"): Promise<boolean> {
    const candidate = await videoRepository.claimNextJob(workerId);
    if (!candidate) return false;
    await this.process(candidate.id);
    return true;
  }

  private async runJob(job: VideoGenerationJobRecord): Promise<void> {
    const current = await videoRepository.findJobById(job.id);
    if (!current || current.status === "cancelled") {
      videoLogger.info("Video job cancelled before processing", { jobId: job.id });
      return;
    }

    const video = await videoRepository.findVideoById(job.videoId);
    if (!video?.sourceStorageKey) {
      await this.failJob(job, "Source image not found.", "invalid_request");
      return;
    }

    await videoRepository.updateJob(job.id, { progress: 10 });
    await videoRepository.updateVideo(video.id, { status: "processing" });

    try {
      await videoRepository.updateJob(job.id, { progress: 25, attempts: job.attempts + 1 });

      const result = await generateSingleVideo({
        userId: video.userId,
        videoId: video.id,
        prompt: video.prompt,
        negativePrompt: video.negativePrompt ?? undefined,
        sourceStorageKey: video.sourceStorageKey,
        configuration: video.configuration,
      });

      const refreshedJob = await videoRepository.findJobById(job.id);
      if (refreshedJob?.status === "cancelled") {
        videoLogger.info("Video job cancelled during generation", { jobId: job.id });
        return;
      }

      await videoRepository.updateJob(job.id, {
        progress: 90,
        providerJobId: result.providerJobId,
      });

      const credits = getVideoGenerationCost(video.duration);

      await videoRepository.updateVideo(video.id, {
        status: "completed",
        storageKey: result.storageKey,
        thumbnailStorageKey: result.thumbnailStorageKey,
        provider: result.provider,
        providerJobId: result.providerJobId,
        creditsUsed: credits,
        completedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage: null,
      });

      await videoRepository.updateJob(job.id, {
        status: "completed",
        progress: 100,
        completedAt: new Date().toISOString(),
      });

      await settleCreditsForVideoJob({
        jobId: job.id,
        userId: video.userId,
        videoId: video.id,
        provider: result.provider,
        model: result.model,
        credits,
        success: true,
      });

      videoLogger.info("Video generation completed", { jobId: job.id, videoId: video.id });
    } catch (error) {
      const attempts = job.attempts + 1;
      const category = categorizeVideoError(error);
      const message = userFacingVideoMessage(category);

      if (attempts < getVideoMaxAttempts() && category !== "configuration_error") {
        videoLogger.warn("Retrying video job", { jobId: job.id, attempts });
        await videoRepository.updateJob(job.id, {
          status: "queued",
          attempts,
          progress: 0,
          errorCode: category,
          errorMessage: message,
        });
        return;
      }

      await this.failJob(job, message, category, attempts);
    }
  }

  private async failJob(
    job: VideoGenerationJobRecord,
    message: string,
    category: string,
    attempts?: number,
  ): Promise<void> {
    const video = await videoRepository.findVideoById(job.videoId);
    const credits = video ? getVideoGenerationCost(video.duration) : 0;

    await videoRepository.updateJob(job.id, {
      status: "failed",
      progress: job.progress,
      attempts: attempts ?? job.attempts,
      errorCode: category,
      errorMessage: message,
      completedAt: new Date().toISOString(),
    });

    if (video) {
      await videoRepository.updateVideo(video.id, {
        status: "failed",
        errorCode: category,
        errorMessage: message,
        completedAt: new Date().toISOString(),
      });
    }

    await settleCreditsForVideoJob({
      jobId: job.id,
      userId: job.userId,
      videoId: job.videoId,
      provider: job.provider,
      credits,
      success: false,
    });

    videoLogger.error("Video generation failed", { jobId: job.id, category, message });
  }
}

export const videoWorker = new VideoWorker();
