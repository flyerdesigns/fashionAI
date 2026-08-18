import { describe, it, expect, beforeEach } from "vitest";
import { metrics, resetMetricsForTests } from "@/lib/metrics";

beforeEach(() => {
  resetMetricsForTests();
});

describe("metrics abstraction", () => {
  it("increments counters and records histogram observations", () => {
    metrics.generationSuccessTotal.inc({ provider: "gemini" });
    metrics.generationDuration.observe({ provider: "gemini" }, 1200);
    metrics.creditReservationTotal.inc({ operation: "generation" }, 2);

    expect(metrics.generationSuccessTotal.getTotal({ provider: "gemini" })).toBe(1);
    expect(metrics.generationDuration.observations).toHaveLength(1);
    expect(metrics.creditReservationTotal.getTotal({ operation: "generation" })).toBe(2);
  });

  it("resets counters for tests", () => {
    metrics.stripeWebhookTotal.inc();
    resetMetricsForTests();
    expect(metrics.stripeWebhookTotal.getTotal()).toBe(0);
  });
});
