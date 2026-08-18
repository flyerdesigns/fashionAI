import { describe, expect, it } from "vitest";
import { resolveRateLimitScope } from "@/lib/rate-limit";

describe("rate limit scopes", () => {
  it("maps generation routes", () => {
    expect(resolveRateLimitScope("/api/generate/photoshoot")).toBe("generation");
    expect(resolveRateLimitScope("/api/generation/job-1/cancel")).toBe("generation");
  });

  it("maps video routes", () => {
    expect(resolveRateLimitScope("/api/generate/video")).toBe("video");
    expect(resolveRateLimitScope("/api/video/jobs/abc/cancel")).toBe("video");
  });

  it("maps billing routes", () => {
    expect(resolveRateLimitScope("/api/billing/checkout")).toBe("billing");
  });

  it("does not rate limit stripe webhook", () => {
    expect(resolveRateLimitScope("/api/stripe/webhook")).toBeNull();
  });
});
