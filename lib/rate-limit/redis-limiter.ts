import type { RateLimiter, RateLimitResult } from "./types";

/**
 * Redis-compatible rate limiter using INCR + EXPIRE.
 * Works with standard Redis and Upstash Redis (redis:// or rediss:// URL).
 */
export class RedisRateLimiter implements RateLimiter {
  readonly id = "redis" as const;
  private client: import("redis").RedisClientType | null = null;
  private connectPromise: Promise<void> | null = null;

  private async getClient(): Promise<import("redis").RedisClientType> {
    if (this.client?.isOpen) return this.client;

    if (!this.connectPromise) {
      this.connectPromise = (async () => {
        const { createClient } = await import("redis");
        const url = process.env.REDIS_URL?.trim();
        if (!url) {
          throw new Error("REDIS_URL is required for redis rate limiting.");
        }
        this.client = createClient({ url });
        this.client.on("error", () => {
          // Connection errors surfaced at check time
        });
        await this.client.connect();
      })();
    }

    await this.connectPromise;
    if (!this.client?.isOpen) {
      throw new Error("Unable to connect to Redis for rate limiting.");
    }
    return this.client;
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const client = await this.getClient();
    const windowSec = Math.max(Math.ceil(windowMs / 1000), 1);
    const redisKey = `ratelimit:${key}`;

    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.expire(redisKey, windowSec);
    }

    const ttl = await client.ttl(redisKey);
    const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(limit - count, 0),
      resetAt,
    };
  }
}
