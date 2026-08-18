import { describe, it, expect } from "vitest";
import { categorizeProviderError, userFacingMessage } from "@/lib/generation/errors";
import { categorizeVideoError, userFacingVideoMessage } from "@/lib/video/errors";

describe("failure and retry normalization", () => {
  it("normalizes gemini timeout errors safely", () => {
    const category = categorizeProviderError(new Error("Image generation timed out"));
    expect(category).toBe("timeout");
    expect(userFacingMessage(category)).not.toMatch(/api[_-]?key/i);
  });

  it("normalizes rate limit errors", () => {
    const category = categorizeProviderError(new Error("429 rate limit exceeded"));
    expect(category).toBe("rate_limit");
  });

  it("normalizes video provider failures", () => {
    const category = categorizeVideoError(new Error("Video generation timed out"));
    expect(category).toBe("timeout");
    expect(userFacingVideoMessage(category)).not.toContain("secret");
  });

  it("normalizes authentication errors without leaking secrets", () => {
    const category = categorizeProviderError(new Error("401 unauthorized api_key=hidden"));
    expect(category).toBe("authentication_error");
    expect(userFacingMessage(category)).not.toMatch(/hidden/);
  });
});
