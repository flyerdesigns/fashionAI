import { describe, it, expect } from "vitest";
import { sanitizeAuditMetadata } from "@/lib/audit/sanitize";

describe("log and audit sanitization", () => {
  it("redacts sensitive metadata keys", () => {
    const sanitized = sanitizeAuditMetadata({
      password: "secret123",
      api_key: "gemini-key",
      stripe_secret: "whsec_test",
      authorization: "Bearer token",
      cookie: "session=abc",
      safeField: "visible",
    });

    expect(sanitized?.password).toBe("[REDACTED]");
    expect(sanitized?.api_key).toBe("[REDACTED]");
    expect(sanitized?.stripe_secret).toBe("[REDACTED]");
    expect(sanitized?.authorization).toBe("[REDACTED]");
    expect(sanitized?.cookie).toBe("[REDACTED]");
    expect(sanitized?.safeField).toBe("visible");
  });

  it("redacts nested sensitive values", () => {
    const sanitized = sanitizeAuditMetadata({
      nested: { token: "abc123", label: "ok" },
    }) as { nested?: { token?: string; label?: string } };

    expect(sanitized?.nested?.token).toBe("[REDACTED]");
    expect(sanitized?.nested?.label).toBe("ok");
  });
});
