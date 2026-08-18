import { creditService, getVideoGenerationCost, InsufficientCreditsError } from "@/lib/credits";
import { isPostgresEnabled } from "@/lib/db/config";
import type { VideoDuration } from "@/types/video";
import { getVideoProviderId } from "@/lib/video/config";

export async function assertSufficientVideoCredits(
  userId: string,
  duration: VideoDuration,
): Promise<number> {
  const required = getVideoGenerationCost(duration);
  if (!isPostgresEnabled()) return required;

  const balance = await creditService.getBalance(userId);
  if (balance.available < required) {
    throw new InsufficientCreditsError(required, balance.available);
  }
  return required;
}

export async function reserveCreditsForVideoJob(
  userId: string,
  jobId: string,
  duration: VideoDuration,
): Promise<number> {
  if (!isPostgresEnabled()) return getVideoGenerationCost(duration);

  const credits = getVideoGenerationCost(duration);
  await creditService.reserveForVideoJob(userId, jobId, credits);
  return credits;
}

export async function settleCreditsForVideoJob(input: {
  jobId: string;
  userId: string;
  videoId: string;
  provider: string;
  model?: string;
  credits: number;
  success: boolean;
}): Promise<void> {
  if (!isPostgresEnabled()) return;

  await creditService.settleVideoJob({
    videoGenerationJobId: input.jobId,
    userId: input.userId,
    videoId: input.videoId,
    provider: input.provider,
    model: input.model,
    credits: input.credits,
    success: input.success,
  });
}

export async function releaseCreditsForVideoJob(jobId: string): Promise<void> {
  if (!isPostgresEnabled()) return;
  await creditService.releaseRemainingForVideoJob(jobId);
}

export function getDefaultVideoProvider(): string {
  return getVideoProviderId();
}

export { InsufficientCreditsError };
