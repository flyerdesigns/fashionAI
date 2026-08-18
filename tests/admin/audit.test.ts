import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "@/lib/audit/sanitize";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

describe("audit sanitize", () => {
  it("redacts sensitive metadata keys", () => {
    const result = sanitizeAuditMetadata({
      amount: 100,
      password: "secret123",
      api_key: "sk-test",
      nested: { stripe_secret: "whsec_x" },
    });

    expect(result?.amount).toBe(100);
    expect(result?.password).toBe("[REDACTED]");
    expect(result?.api_key).toBe("[REDACTED]");
    expect((result?.nested as Record<string, unknown>).stripe_secret).toBe("[REDACTED]");
  });

  it("defines typed admin audit actions", () => {
    expect(AUDIT_ACTIONS.ADMIN_CREDIT_GRANT).toBe("ADMIN_CREDIT_GRANT");
    expect(AUDIT_ACTIONS.ADMIN_USER_ROLE_CHANGE).toBe("ADMIN_USER_ROLE_CHANGE");
  });
});
