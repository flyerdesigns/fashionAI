export type EnvConfigStatus = "CONFIGURED" | "MISSING" | "INVALID";

export interface EnvConfigEntry {
  key: string;
  status: EnvConfigStatus;
  note?: string;
}

function isSet(name: string): boolean {
  return !!process.env[name]?.trim();
}

function entry(key: string, status: EnvConfigStatus, note?: string): EnvConfigEntry {
  return { key, status, note };
}

export function getStagingEnvReport(options?: {
  production?: boolean;
}): EnvConfigEntry[] {
  const production = options?.production ?? process.env.STAGING_VALIDATE_PRODUCTION === "true";
  const rows: EnvConfigEntry[] = [];

  const requiredAlways = ["AUTH_SECRET", "APP_URL", "AUTH_URL"] as const;
  for (const key of requiredAlways) {
    rows.push(entry(key, isSet(key) ? "CONFIGURED" : production ? "MISSING" : "MISSING"));
  }

  rows.push(
    entry(
      "DATABASE_URL",
      isSet("DATABASE_URL") ? "CONFIGURED" : production ? "MISSING" : "MISSING",
    ),
  );

  const dbProvider = process.env.DATABASE_PROVIDER?.trim();
  rows.push(
    entry(
      "DATABASE_PROVIDER",
      !dbProvider
        ? "MISSING"
        : production && dbProvider !== "postgres"
          ? "INVALID"
          : "CONFIGURED",
      production ? "must be postgres" : undefined,
    ),
  );

  const storageProvider = process.env.STORAGE_PROVIDER?.trim();
  rows.push(
    entry(
      "STORAGE_PROVIDER",
      !storageProvider
        ? "MISSING"
        : production && storageProvider !== "s3"
          ? "INVALID"
          : "CONFIGURED",
    ),
  );

  for (const key of ["AWS_S3_BUCKET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] as const) {
    if (storageProvider === "s3" || production) {
      rows.push(entry(key, isSet(key) ? "CONFIGURED" : "MISSING"));
    }
  }

  const rateLimit = process.env.RATE_LIMIT_PROVIDER?.trim() ?? "memory";
  rows.push(entry("RATE_LIMIT_PROVIDER", "CONFIGURED", rateLimit));
  if (rateLimit === "redis") {
    rows.push(entry("REDIS_URL", isSet("REDIS_URL") ? "CONFIGURED" : "MISSING"));
  }

  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const) {
    rows.push(entry(key, isSet(key) ? "CONFIGURED" : production ? "MISSING" : "MISSING"));
  }

  for (const key of ["STRIPE_STARTER_PRICE_ID", "STRIPE_PRO_PRICE_ID", "STRIPE_BUSINESS_PRICE_ID"] as const) {
    rows.push(entry(key, isSet(key) ? "CONFIGURED" : "MISSING", "recommended for billing"));
  }

  rows.push(entry("GEMINI_API_KEY", isSet("GEMINI_API_KEY") ? "CONFIGURED" : production ? "MISSING" : "MISSING"));

  const videoKey = process.env.VIDEO_PROVIDER_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  rows.push(
    entry(
      "VIDEO_PROVIDER_API_KEY",
      videoKey ? "CONFIGURED" : "MISSING",
      "required for video generation",
    ),
  );

  for (const key of ["PLAYWRIGHT_TEST_EMAIL", "PLAYWRIGHT_TEST_PASSWORD"] as const) {
    rows.push(entry(key, isSet(key) ? "CONFIGURED" : "MISSING", "E2E staging user"));
  }

  for (const key of ["PLAYWRIGHT_ADMIN_TEST_EMAIL", "PLAYWRIGHT_ADMIN_TEST_PASSWORD"] as const) {
    rows.push(entry(key, isSet(key) ? "CONFIGURED" : "MISSING", "E2E admin user"));
  }

  return rows;
}

export function formatStagingEnvReport(rows: EnvConfigEntry[]): string {
  return rows
    .map((row) => {
      const note = row.note ? ` (${row.note})` : "";
      return `${row.key}: ${row.status}${note}`;
    })
    .join("\n");
}

export function stagingEnvHasBlockingIssues(rows: EnvConfigEntry[]): boolean {
  return rows.some((row) => row.status === "MISSING" || row.status === "INVALID");
}
