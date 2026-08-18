const PRODUCTION_URL_MARKERS = [
  "prod",
  "production",
  "live",
  "rds.amazonaws.com",
];

export class TestEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestEnvironmentError";
  }
}

export function isIntegrationTestEnabled(): boolean {
  return !!process.env.DATABASE_URL_TEST?.trim();
}

export function configureIntegrationEnv(): void {
  const testUrl = process.env.DATABASE_URL_TEST?.trim();
  if (!testUrl) return;

  process.env.DATABASE_PROVIDER = "postgres";
  process.env.DATABASE_URL = testUrl;
  Reflect.set(process.env, "NODE_ENV", "test");
  process.env.STORAGE_PROVIDER = "local";
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || "test-gemini-key";
  process.env.VIDEO_PROVIDER_API_KEY = process.env.VIDEO_PROVIDER_API_KEY?.trim() || "test-video-key";
  process.env.CREDITS_PER_IMAGE = process.env.CREDITS_PER_IMAGE?.trim() || "5";
  process.env.CREDITS_SIGNUP_BONUS = process.env.CREDITS_SIGNUP_BONUS?.trim() || "100";
}

export function isRedisIntegrationTestEnabled(): boolean {
  return !!process.env.REDIS_URL_TEST?.trim();
}

export function configureRedisIntegrationEnv(): void {
  const redisUrl = process.env.REDIS_URL_TEST?.trim();
  if (!redisUrl) return;
  process.env.RATE_LIMIT_PROVIDER = "redis";
  process.env.REDIS_URL = redisUrl;
}

export function assertIntegrationTestEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new TestEnvironmentError("Integration tests cannot run with NODE_ENV=production.");
  }

  const testUrl = process.env.DATABASE_URL_TEST?.trim();
  if (!testUrl) {
    throw new TestEnvironmentError(
      "DATABASE_URL_TEST is required for integration tests. Example: postgresql://postgres:postgres@localhost:5432/atelier_ai_test",
    );
  }

  const lower = testUrl.toLowerCase();
  if (PRODUCTION_URL_MARKERS.some((marker) => lower.includes(marker))) {
    throw new TestEnvironmentError(
      "DATABASE_URL_TEST appears to reference a production database. Use a dedicated test database.",
    );
  }

  const prodUrl = process.env.DATABASE_URL?.trim();
  if (prodUrl && prodUrl === testUrl && process.env.CI !== "true") {
    throw new TestEnvironmentError(
      "DATABASE_URL_TEST must not equal DATABASE_URL outside CI.",
    );
  }
}
