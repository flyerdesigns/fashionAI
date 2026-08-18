import { describe, expect, it } from "vitest";
import { validateEnvironment, getEnvironmentMode } from "@/lib/env/validate";

describe("environment validation", () => {
  it("passes in development with minimal config", () => {
    const issues = validateEnvironment({ mode: "development" });
    const errors = issues.filter((issue) => issue.level === "error");
    expect(errors.length).toBe(0);
  });

  it("requires postgres and s3 in production mode", () => {
    const issues = validateEnvironment({ mode: "production" });
    const keys = issues.map((issue) => issue.key);
    expect(keys).toContain("DATABASE_URL");
    expect(keys).toContain("AWS_S3_BUCKET");
    expect(keys).toContain("STRIPE_SECRET_KEY");
  });

  it("detects test mode", () => {
    expect(getEnvironmentMode()).toBe("test");
  });
});
