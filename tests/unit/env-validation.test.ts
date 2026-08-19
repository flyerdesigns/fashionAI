import { describe, expect, it } from "vitest";
import { validateEnvironment, getEnvironmentMode } from "@/lib/env/validate";

describe("environment validation", () => {
  it("passes in development with minimal config", () => {
    const issues = validateEnvironment({ mode: "development" });
    const errors = issues.filter((issue) => issue.level === "error");
    expect(errors.length).toBe(0);
  });

  it("requires postgres and s3 in production mode", () => {
    const saved: Record<string, string | undefined> = {};
    const keysToClear = [
      "DATABASE_URL",
      "DATABASE_PROVIDER",
      "STORAGE_PROVIDER",
      "AWS_S3_BUCKET",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "GEMINI_API_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "APP_URL",
    ];

    for (const key of keysToClear) {
      saved[key] = process.env[key];
      delete process.env[key];
    }

    try {
      const issues = validateEnvironment({ mode: "production" });
      const keys = issues.map((issue) => issue.key);
      expect(keys).toContain("DATABASE_URL");
      expect(keys).toContain("AWS_S3_BUCKET");
      expect(keys).toContain("STRIPE_SECRET_KEY");
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it("detects test mode", () => {
    expect(getEnvironmentMode()).toBe("test");
  });
});
