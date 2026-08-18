import { describeIntegration } from "./setup";
import {
  configureRedisIntegrationEnv,
  isRedisIntegrationTestEnabled,
} from "@/lib/test/env-guard";
import { checkRateLimit, resetRateLimiterForTests, resolveRateLimitScope } from "@/lib/rate-limit";

function describeRedisIntegration(name: string, fn: () => void): void {
  if (isRedisIntegrationTestEnabled()) {
    configureRedisIntegrationEnv();
    describe(name, fn);
  } else {
    describe.skip(`${name} (REDIS_URL_TEST not set)`, fn);
  }
}

describeIntegration("rate limiting integration", () => {
  beforeEach(() => {
    resetRateLimiterForTests();
    process.env.RATE_LIMIT_PROVIDER = "memory";
  });

  it("excludes stripe webhook from rate limiting", () => {
    expect(resolveRateLimitScope("/api/stripe/webhook")).toBeNull();
  });

  it("enforces memory provider limits per scope", async () => {
    process.env.RATE_LIMIT_GENERATION_PER_MINUTE = "2";

    for (let i = 0; i < 2; i++) {
      const result = await checkRateLimit("generation", "test-ip");
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkRateLimit("generation", "test-ip");
    expect(blocked.allowed).toBe(false);
  });
});

describeRedisIntegration("redis rate limiting integration", () => {
  beforeEach(() => {
    resetRateLimiterForTests();
    configureRedisIntegrationEnv();
  });

  it("enforces limits with redis provider", async () => {
    process.env.RATE_LIMIT_GENERATION_PER_MINUTE = "2";
    const first = await checkRateLimit("generation", "redis-user-a");
    const second = await checkRateLimit("generation", "redis-user-a");
    const third = await checkRateLimit("generation", "redis-user-a");

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("isolates counters by identifier", async () => {
    process.env.RATE_LIMIT_AUTH_PER_MINUTE = "1";
    await checkRateLimit("auth", "ip-a");
    const blockedA = await checkRateLimit("auth", "ip-a");
    const allowedB = await checkRateLimit("auth", "ip-b");

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });
});
