import { describe, it, expect } from "vitest";
import { resolveRateLimitScope } from "@/lib/rate-limit";
import { getReadinessCheck } from "@/lib/health/checks";
import { createRequestId, getRequestIdFromHeaders } from "@/lib/logging/logger";

describe("rate limiting scopes", () => {
  it("maps generation and video endpoints", () => {
    expect(resolveRateLimitScope("/api/generate/photoshoot")).toBe("generation");
    expect(resolveRateLimitScope("/api/generate/video")).toBe("video");
    expect(resolveRateLimitScope("/api/billing/checkout")).toBe("billing");
  });

  it("excludes stripe webhook from rate limiting", () => {
    expect(resolveRateLimitScope("/api/stripe/webhook")).toBeNull();
  });
});

describe("health checks", () => {
  it("returns liveness-compatible readiness shape", async () => {
    const health = await getReadinessCheck();
    expect(["ok", "degraded", "unavailable"]).toContain(health.status);
    expect(health.services).toBeDefined();
    expect(JSON.stringify(health)).not.toContain("DATABASE_URL");
  });
});

describe("request id tracing", () => {
  it("preserves incoming request id header", () => {
    const headers = new Headers({ "x-request-id": "req-integration-123" });
    expect(getRequestIdFromHeaders(headers)).toBe("req-integration-123");
  });

  it("creates uuid request ids", () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
