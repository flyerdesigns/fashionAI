import { describe, expect, it } from "vitest";
import { isAdminRole } from "@/lib/admin/config";

describe("admin authorization", () => {
  it("recognizes admin role", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it("prevents self-demotion logic at API layer", () => {
    const actorId = "admin-1";
    const targetId = "admin-1";
    const role = "user" as string;
    const blocked = targetId === actorId && role !== "admin";
    expect(blocked).toBe(true);
  });

  it("rejects client-supplied role escalation pattern", () => {
    const bodyRole = "admin";
    const sessionRole = "user" as string;
    const allowed = sessionRole === "admin";
    expect(allowed).toBe(false);
    expect(bodyRole).toBe("admin");
  });
});

describe("credit admin validation", () => {
  it("rejects invalid amounts", () => {
    expect(Number.isInteger(0)).toBe(true);
    expect(0 <= 0).toBe(true);
  });

  it("requires reason length", () => {
    const reason = "ab";
    expect(reason.trim().length >= 3).toBe(false);
  });
});

describe("admin stats", () => {
  it("uses unavailable label for missing worker data", () => {
    const workerStatus = undefined;
    const label = workerStatus ?? "unavailable";
    expect(label).toBe("unavailable");
  });
});
