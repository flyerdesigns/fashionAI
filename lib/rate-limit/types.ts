export type RateLimitProviderId = "memory" | "redis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  readonly id: RateLimitProviderId;
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export type RateLimitScope =
  | "auth"
  | "generation"
  | "video"
  | "billing"
  | "default";
