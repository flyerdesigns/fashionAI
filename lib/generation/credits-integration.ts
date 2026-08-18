import { generationJobRepository } from "@/lib/generation/repository";
import { photoshootRepository } from "@/lib/photoshoot/repository";
import {
  calculateGenerationCost,
  creditService,
  getCostPerImage,
  mapJobTypeToOperation,
  InsufficientCreditsError,
} from "@/lib/credits";
import { isPostgresEnabled } from "@/lib/db/config";
import { getImageProviderConfig } from "@/lib/ai/config";
import type { GenerationJob, GenerationJobType } from "@/types/generation-job";

export async function reserveCreditsForJob(
  userId: string,
  jobId: string,
  imageCount: number,
  jobType: GenerationJobType,
): Promise<void> {
  if (!isPostgresEnabled()) return;

  const operation = mapJobTypeToOperation(jobType);
  const credits = calculateGenerationCost(imageCount, operation);
  await creditService.reserve(userId, jobId, credits);
}

export async function cleanupJobOnCreditFailure(
  jobId: string,
  photoshootId: string,
): Promise<void> {
  await generationJobRepository.delete(jobId);
  await photoshootRepository.delete(photoshootId);
}

export async function settleCreditsForJob(job: GenerationJob): Promise<void> {
  if (!isPostgresEnabled()) return;

  const operation = mapJobTypeToOperation(job.type);
  const costPerImage = getCostPerImage(operation);
  const cancelledImages = job.images.filter((img) => img.status === "cancelled").length;
  const providerConfig = getImageProviderConfig();

  await creditService.settleGenerationJob({
    generationJobId: job.id,
    userId: job.userId,
    photoshootId: job.photoshootId,
    provider: job.provider,
    operation,
    costPerImage,
    completedImages: job.completedImages,
    failedImages: job.failedImages,
    cancelledImages,
    model: providerConfig.geminiModel,
  });
}

export async function assertSufficientCredits(
  userId: string,
  imageCount: number,
  jobType: GenerationJobType,
): Promise<void> {
  if (!isPostgresEnabled()) return;

  const operation = mapJobTypeToOperation(jobType);
  const required = calculateGenerationCost(imageCount, operation);
  const balance = await creditService.getBalance(userId);
  if (balance.available < required) {
    throw new InsufficientCreditsError(required, balance.available);
  }
}

export { InsufficientCreditsError };
