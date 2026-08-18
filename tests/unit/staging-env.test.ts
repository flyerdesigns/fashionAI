import { describe, it, expect } from "vitest";
import { getStagingEnvReport, stagingEnvHasBlockingIssues } from "@/lib/env/staging-status";

describe("staging environment status", () => {
  it("reports MISSING for required keys when unset", () => {
    const original = { ...process.env };
    process.env.AUTH_SECRET = "";
    process.env.DATABASE_URL = "";

    const rows = getStagingEnvReport({ production: true });
    const auth = rows.find((r) => r.key === "AUTH_SECRET");
    const db = rows.find((r) => r.key === "DATABASE_URL");

    expect(auth?.status).toBe("MISSING");
    expect(db?.status).toBe("MISSING");
    expect(stagingEnvHasBlockingIssues(rows)).toBe(true);

    process.env = original;
  });

  it("reports INVALID when production database provider is json", () => {
    const original = { ...process.env };
    process.env.DATABASE_PROVIDER = "json";
    process.env.DATABASE_URL = "postgresql://localhost/test";

    const rows = getStagingEnvReport({ production: true });
    const provider = rows.find((r) => r.key === "DATABASE_PROVIDER");
    expect(provider?.status).toBe("INVALID");

    process.env = original;
  });
});
