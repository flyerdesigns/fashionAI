import { describe, expect, it } from "vitest";
import { categorizeProviderError } from "@/lib/generation/errors";
import { categorizeVideoError, userFacingVideoMessage } from "@/lib/video/errors";

describe("error normalization", () => {
  it("classifies rate limits for image generation", () => {
    expect(categorizeProviderError(new Error("429 rate limit exceeded"))).toBe("rate_limit");
  });

  it("classifies configuration errors for video", () => {
    expect(categorizeVideoError(new Error("Video generation provider is not configured."))).toBe(
      "configuration_error",
    );
  });

  it("never exposes raw api key strings in user-facing video messages", () => {
    const message = userFacingVideoMessage("authentication_error");
    expect(message.toLowerCase()).not.toContain("api_key");
  });
});
