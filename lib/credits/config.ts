import type { CreditOperation } from "./types";

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getSignupBonusCredits(): number {
  return readInt("CREDITS_SIGNUP_BONUS", 100);
}

export function getImageGenerationCost(): number {
  return readInt("CREDITS_PER_IMAGE", 5);
}

export function getRegenerationCost(): number {
  return readInt("CREDITS_PER_REGENERATION", getImageGenerationCost());
}

export function getRetryFailedCost(): number {
  return readInt("CREDITS_PER_RETRY", getImageGenerationCost());
}

export function getReservationTimeoutMs(): number {
  return readInt("CREDIT_RESERVATION_TIMEOUT_MS", 2 * 60 * 60 * 1000);
}

export function getCostPerImage(operation: CreditOperation): number {
  switch (operation) {
    case "regenerate_image":
      return getRegenerationCost();
    case "retry_failed_image":
      return getRetryFailedCost();
    case "video_generation":
      return getImageGenerationCost();
    case "photoshoot_image":
    default:
      return getImageGenerationCost();
  }
}

export function getVideoGenerationCost(duration: 5 | 10 | 15): number {
  switch (duration) {
    case 10:
      return readInt("CREDITS_VIDEO_10_SEC", 40);
    case 15:
      return readInt("CREDITS_VIDEO_15_SEC", 60);
    case 5:
    default:
      return readInt("CREDITS_VIDEO_5_SEC", 25);
  }
}

export function calculateGenerationCost(
  imageCount: number,
  operation: CreditOperation,
): number {
  return imageCount * getCostPerImage(operation);
}

export function mapJobTypeToOperation(
  jobType: "photoshoot" | "regenerate" | "retry_failed",
): CreditOperation {
  switch (jobType) {
    case "regenerate":
      return "regenerate_image";
    case "retry_failed":
      return "retry_failed_image";
    default:
      return "photoshoot_image";
  }
}
