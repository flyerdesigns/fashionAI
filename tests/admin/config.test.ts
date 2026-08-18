import { describe, expect, it } from "vitest";
import {
  isBootstrapAdminEmail,
  parseAdminEmails,
  resolveRoleForEmail,
} from "@/lib/admin/config";

describe("admin config", () => {
  it("parses ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = " Admin@Example.com , other@test.com ";
    expect(parseAdminEmails()).toEqual(
      new Set(["admin@example.com", "other@test.com"]),
    );
  });

  it("bootstraps admin role from email list", () => {
    process.env.ADMIN_EMAILS = "owner@atelier.test";
    expect(isBootstrapAdminEmail("owner@atelier.test")).toBe(true);
    expect(resolveRoleForEmail("owner@atelier.test")).toBe("admin");
    expect(resolveRoleForEmail("user@atelier.test")).toBe("user");
  });

  it("never demotes existing admin via bootstrap", () => {
    process.env.ADMIN_EMAILS = "";
    expect(resolveRoleForEmail("user@example.com", "admin")).toBe("admin");
  });
});
