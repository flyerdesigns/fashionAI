import type { GenerationErrorCategory } from "@/types/generation-job";

export const USER_FACING_GENERATION_ERROR =
  "Something went wrong while generating your photoshoot. Please try again.";

export function userFacingMessage(category: GenerationErrorCategory): string {
  switch (category) {
    case "configuration_error":
    case "authentication_error":
      return "AI generation is not configured. Please set GEMINI_API_KEY.";
    case "rate_limit":
      return "AI generation rate limit reached. Please try again shortly.";
    case "timeout":
      return "AI generation timed out. Please try again.";
    case "storage_error":
      return "Unable to save generated images. Please try again.";
    case "invalid_request":
    case "provider_error":
    case "unknown_error":
    default:
      return USER_FACING_GENERATION_ERROR;
  }
}

export function categorizeProviderError(error: unknown): GenerationErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("gemini_api_key") || lower.includes("not configured")) {
    return "configuration_error";
  }
  if (lower.includes("api key") || lower.includes("api_key") || lower.includes("unauthorized")) {
    return "authentication_error";
  }
  if (lower.includes("rate") || lower.includes("quota") || lower.includes("429")) {
    return "rate_limit";
  }
  if (lower.includes("timeout") || lower.includes("deadline") || lower.includes("timed out")) {
    return "timeout";
  }
  if (lower.includes("invalid") || lower.includes("bad request") || lower.includes("400")) {
    return "invalid_request";
  }
  if (lower.includes("storage") || lower.includes("enoent") || lower.includes("eacces")) {
    return "storage_error";
  }
  if (
    lower.includes("s3") ||
    lower.includes("aws") ||
    lower.includes("accessdenied") ||
    lower.includes("nosuchkey") ||
    lower.includes("bucket")
  ) {
    return "storage_error";
  }
  if (lower.includes("prisma") || lower.includes("database") || lower.includes("p1001")) {
    return "unknown_error";
  }
  if (lower.includes("provider") || lower.includes("gemini")) {
    return "provider_error";
  }

  return "unknown_error";
}

export class GenerationServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public category: GenerationErrorCategory = "unknown_error",
  ) {
    super(message);
    this.name = "GenerationServiceError";
  }
}
