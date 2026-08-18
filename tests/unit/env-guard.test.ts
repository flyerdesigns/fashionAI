import { describe, it, expect, afterEach, vi } from "vitest";
import {
  assertIntegrationTestEnvironment,
  configureIntegrationEnv,
  isIntegrationTestEnabled,
  TestEnvironmentError,
} from "@/lib/test/env-guard";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

describe("integration test env guard", () => {
  it("detects when DATABASE_URL_TEST is unset", () => {
    delete process.env.DATABASE_URL_TEST;
    expect(isIntegrationTestEnabled()).toBe(false);
  });

  it("configures postgres test env from DATABASE_URL_TEST", () => {
    process.env.DATABASE_URL_TEST = "postgresql://postgres:postgres@localhost:5432/atelier_ai_test";
    configureIntegrationEnv();
    expect(process.env.DATABASE_PROVIDER).toBe("postgres");
    expect(process.env.DATABASE_URL).toBe(process.env.DATABASE_URL_TEST);
    expect(process.env.NODE_ENV).toBe("test");
  });

  it("rejects production NODE_ENV", () => {
    process.env.DATABASE_URL_TEST = "postgresql://postgres:postgres@localhost:5432/atelier_ai_test";
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertIntegrationTestEnvironment()).toThrow(TestEnvironmentError);
  });

  it("rejects production-like database URLs", () => {
    process.env.DATABASE_URL_TEST = "postgresql://user:pass@my-prod-db.rds.amazonaws.com/app";
    expect(() => assertIntegrationTestEnvironment()).toThrow(TestEnvironmentError);
  });
});
