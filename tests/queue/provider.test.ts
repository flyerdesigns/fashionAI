import { describe, expect, it } from "vitest";
import { getQueueProviderId } from "@/lib/queue";

describe("queue provider", () => {
  it("defaults to local queue", () => {
    delete process.env.QUEUE_PROVIDER;
    expect(getQueueProviderId()).toBe("local");
  });

  it("supports bullmq when configured", () => {
    process.env.QUEUE_PROVIDER = "bullmq";
    expect(getQueueProviderId()).toBe("bullmq");
  });
});
