import type { RateLimitScope, RateLimiter } from "./types";
import { MemoryRateLimiter } from "./memory-limiter";
import { RedisRateLimiter } from "./redis-limiter";

let cachedLimiter: RateLimiter | null = null;

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRateLimitProviderId(): "memory" | "redis" {
  const configured = process.env.RATE_LIMIT_PROVIDER?.trim();
  if (configured === "redis") return "redis";
  return "memory";
}

export function getRateLimiter(): RateLimiter {
  if (cachedLimiter) return cachedLimiter;

  const provider = getRateLimitProviderId();
  if (provider === "redis") {
    cachedLimiter = new RedisRateLimiter();
    return cachedLimiter;
  }

  cachedLimiter = new MemoryRateLimiter();
  return cachedLimiter;
}

/** Reset cached limiter — for tests only. */
export function resetRateLimiterForTests(): void {
  cachedLimiter = null;
}

export function getRateLimitConfig(scope: RateLimitScope): { limit: number; windowMs: number } {
  switch (scope) {
    case "auth":
      return {
        limit: readInt("RATE_LIMIT_AUTH_PER_MINUTE", 20),
        windowMs: 60_000,
      };
    case "generation":
      return {
        limit: readInt("RATE_LIMIT_GENERATION_PER_MINUTE", 10),
        windowMs: 60_000,
      };
    case "video":
      return {
        limit: readInt("RATE_LIMIT_VIDEO_PER_MINUTE", 5),
        windowMs: 60_000,
      };
    case "billing":
      return {
        limit: readInt("RATE_LIMIT_BILLING_PER_MINUTE", 10),
        windowMs: 60_000,
      };
    default:
      return {
        limit: readInt("RATE_LIMIT_DEFAULT_PER_MINUTE", 120),
        windowMs: 60_000,
      };
  }
}

export async function checkRateLimit(
  scope: RateLimitScope,
  identifier: string,
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const limiter = getRateLimiter();
  const config = getRateLimitConfig(scope);
  const key = `${scope}:${identifier}`;
  const result = await limiter.check(key, config.limit, config.windowMs);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  return { allowed: result.allowed, headers };
}

export function resolveRateLimitScope(pathname: string): RateLimitScope | null {
  if (pathname.startsWith("/api/auth") || pathname === "/login" || pathname === "/signup") {
    return "auth";
  }
  if (
    pathname.startsWith("/api/generate/photoshoot") ||
    pathname.startsWith("/api/generate/regenerate") ||
    pathname.startsWith("/api/generation/") ||
    pathname.startsWith("/api/photoshoots/") && pathname.includes("retry")
  ) {
    return "generation";
  }
  if (pathname.startsWith("/api/generate/video") || pathname.startsWith("/api/video/")) {
    return "video";
  }
  if (pathname.startsWith("/api/billing/")) {
    return "billing";
  }
  return null;
}
