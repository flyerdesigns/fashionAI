export type EnvironmentMode = "development" | "production" | "test";

export interface EnvValidationIssue {
  level: "error" | "warning";
  key: string;
  message: string;
}

function isSet(name: string): boolean {
  return !!process.env[name]?.trim();
}

export function getEnvironmentMode(): EnvironmentMode {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") return "production";
  if (nodeEnv === "test") return "test";
  return "development";
}

export function isProductionEnvironment(): boolean {
  return getEnvironmentMode() === "production";
}

export function validateEnvironment(options?: {
  mode?: EnvironmentMode;
}): EnvValidationIssue[] {
  const mode = options?.mode ?? getEnvironmentMode();
  const issues: EnvValidationIssue[] = [];

  if (!isSet("AUTH_SECRET")) {
    issues.push({
      level: mode === "production" ? "error" : "warning",
      key: "AUTH_SECRET",
      message: "AUTH_SECRET is required for secure sessions.",
    });
  }

  if (mode === "production") {
    const required = [
      ["DATABASE_URL", "PostgreSQL connection string"],
      ["DATABASE_PROVIDER", "Must be postgres in production"],
      ["STORAGE_PROVIDER", "Must be s3 in production"],
      ["AWS_S3_BUCKET", "S3 bucket name"],
      ["AWS_ACCESS_KEY_ID", "AWS access key"],
      ["AWS_SECRET_ACCESS_KEY", "AWS secret key"],
      ["GEMINI_API_KEY", "Gemini API key for image generation"],
      ["STRIPE_SECRET_KEY", "Stripe secret key"],
      ["STRIPE_WEBHOOK_SECRET", "Stripe webhook signing secret"],
      ["APP_URL", "Application URL for billing redirects"],
    ] as const;

    for (const [key, message] of required) {
      if (!isSet(key)) {
        issues.push({ level: "error", key, message });
      }
    }

    for (const key of ["STRIPE_STARTER_PRICE_ID", "STRIPE_PRO_PRICE_ID", "STRIPE_BUSINESS_PRICE_ID"]) {
      if (!isSet(key)) {
        issues.push({
          level: "warning",
          key,
          message: "Stripe price ID recommended for subscription checkout.",
        });
      }
    }

    if (process.env.DATABASE_PROVIDER?.trim() !== "postgres") {
      issues.push({
        level: "error",
        key: "DATABASE_PROVIDER",
        message: "DATABASE_PROVIDER must be postgres in production.",
      });
    }

    if (process.env.STORAGE_PROVIDER?.trim() !== "s3") {
      issues.push({
        level: "error",
        key: "STORAGE_PROVIDER",
        message: "STORAGE_PROVIDER must be s3 in production.",
      });
    }

    const rateLimitProvider = process.env.RATE_LIMIT_PROVIDER?.trim() ?? "memory";
    if (rateLimitProvider === "redis" && !isSet("REDIS_URL")) {
      issues.push({
        level: "error",
        key: "REDIS_URL",
        message: "REDIS_URL is required when RATE_LIMIT_PROVIDER=redis.",
      });
    }

    if (rateLimitProvider === "memory") {
      issues.push({
        level: "warning",
        key: "RATE_LIMIT_PROVIDER",
        message:
          "In-memory rate limiting is not reliable across multiple instances. Use redis in production.",
      });
    }
  }

  for (const key of ["STRIPE_SECRET_KEY", "GEMINI_API_KEY", "AWS_SECRET_ACCESS_KEY"]) {
    if (process.env[`NEXT_PUBLIC_${key}`]) {
      issues.push({
        level: "error",
        key: `NEXT_PUBLIC_${key}`,
        message: "Secrets must never be exposed via NEXT_PUBLIC_ variables.",
      });
    }
  }

  if (isSet("SENTRY_DSN")) {
    if (!isSet("SENTRY_ENVIRONMENT")) {
      issues.push({
        level: "warning",
        key: "SENTRY_ENVIRONMENT",
        message: "Set SENTRY_ENVIRONMENT when SENTRY_DSN is configured.",
      });
    }
  }

  return issues;
}

export function assertProductionEnvironment(): void {
  const issues = validateEnvironment({ mode: "production" });
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length === 0) return;

  const summary = errors.map((issue) => `${issue.key}: ${issue.message}`).join("\n");
  throw new Error(`Production environment validation failed:\n${summary}`);
}

export function formatValidationReport(issues: EnvValidationIssue[]): string {
  if (issues.length === 0) return "Environment validation passed.";
  return issues
    .map((issue) => `[${issue.level.toUpperCase()}] ${issue.key}: ${issue.message}`)
    .join("\n");
}
