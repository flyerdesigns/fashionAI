import type { RateLimiter, RateLimitResult } from "./types";

interface BucketEntry {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter implements RateLimiter {
  readonly id = "memory" as const;
  private buckets = new Map<string, BucketEntry>();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { allowed: true, limit, remaining: limit - 1, resetAt };
    }

    if (existing.count >= limit) {
      return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    this.buckets.set(key, existing);
    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - existing.count, 0),
      resetAt: existing.resetAt,
    };
  }
}
