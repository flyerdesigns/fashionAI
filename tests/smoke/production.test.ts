import { describe, it, expect } from "vitest";
import { getLivenessCheck, getReadinessCheck } from "@/lib/health/checks";
import { validateEnvironment } from "@/lib/env/validate";

describe("production smoke tests", () => {
  it("reports liveness", async () => {
    const health = await getLivenessCheck();
    expect(health.status).toBe("ok");
  });

  it("reports readiness without exposing secrets", async () => {
    const health = await getReadinessCheck();
    expect(["ok", "degraded", "unavailable"]).toContain(health.status);
    const serialized = JSON.stringify(health);
    expect(serialized).not.toMatch(/DATABASE_URL|AWS_SECRET|STRIPE_SECRET|GEMINI_API_KEY/);
  });

  it("validates environment configuration shape", () => {
    const issues = validateEnvironment({ mode: "development" });
    expect(Array.isArray(issues)).toBe(true);
    for (const issue of issues) {
      expect(issue.message).not.toMatch(/sk_live|whsec_|AKIA/);
    }
  });

  it("exposes health API routes", async () => {
    const { GET: healthGet } = await import("@/app/api/health/route");
    const { GET: liveGet } = await import("@/app/api/health/live/route");
    const { GET: readyGet } = await import("@/app/api/health/ready/route");

    expect((await healthGet()).status).toBeLessThan(600);
    expect((await liveGet()).status).toBeLessThan(600);
    expect((await readyGet()).status).toBeLessThan(600);
  });
});
