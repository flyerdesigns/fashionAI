import type { VideoErrorCategory } from "@/types/video";

export const USER_FACING_VIDEO_ERROR =
  "Something went wrong while generating your video. Please try again.";

export function userFacingVideoMessage(category: VideoErrorCategory): string {
  switch (category) {
    case "configuration_error":
      return "Video generation provider is not configured.";
    case "authentication_error":
      return "Video generation authentication failed. Please contact support.";
    case "rate_limit":
      return "Video generation rate limit reached. Please try again shortly.";
    case "timeout":
      return "Video generation timed out. Please try again.";
    case "storage_error":
      return "Unable to save your generated video. Please try again.";
    case "insufficient_credits":
      return "Insufficient credits for this video.";
    case "cancelled":
      return "Video generation was cancelled.";
    case "invalid_request":
      return "Invalid video generation request.";
    case "provider_error":
    case "unknown_error":
    default:
      return USER_FACING_VIDEO_ERROR;
  }
}

export function categorizeVideoError(error: unknown): VideoErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("not configured") || lower.includes("video generation provider")) {
    return "configuration_error";
  }
  if (lower.includes("api key") || lower.includes("unauthorized")) {
    return "authentication_error";
  }
  if (lower.includes("rate") || lower.includes("quota") || lower.includes("429")) {
    return "rate_limit";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "timeout";
  }
  if (lower.includes("insufficient credits")) {
    return "insufficient_credits";
  }
  if (lower.includes("cancelled")) {
    return "cancelled";
  }
  if (lower.includes("invalid") || lower.includes("not found")) {
    return "invalid_request";
  }
  if (lower.includes("storage") || lower.includes("s3") || lower.includes("upload")) {
    return "storage_error";
  }
  return "provider_error";
}

export class VideoServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public category: VideoErrorCategory = "unknown_error",
  ) {
    super(message);
    this.name = "VideoServiceError";
  }
}
