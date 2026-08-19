import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { MemoryRateLimiter } from "@/lib/rate-limit/memory-limiter";
import { resolveRateLimitScope } from "@/lib/rate-limit";

describe("memory rate limiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = new MemoryRateLimiter();
    const first = await limiter.check("user:1", 3, 60_000);
    const second = await limiter.check("user:1", 3, 60_000);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("blocks requests over the limit", async () => {
    const limiter = new MemoryRateLimiter();
    await limiter.check("user:2", 2, 60_000);
    await limiter.check("user:2", 2, 60_000);
    const third = await limiter.check("user:2", 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("isolates keys", async () => {
    const limiter = new MemoryRateLimiter();
    await limiter.check("a", 1, 60_000);
    const blocked = await limiter.check("a", 1, 60_000);
    const allowed = await limiter.check("b", 1, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it("excludes stripe webhook from rate limiting scopes", () => {
    expect(resolveRateLimitScope("/api/stripe/webhook")).toBeNull();
  });

  it("proxy fail-closed policy exists for production redis outages", () => {
    const source = readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8");
    expect(source).toContain('process.env.RATE_LIMIT_PROVIDER === "redis"');
    expect(source).toContain("503");
  });
});
