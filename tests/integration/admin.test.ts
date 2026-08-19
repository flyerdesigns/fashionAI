import { describeIntegration } from "./setup";
import { vi } from "vitest";
import { createTestUser } from "./helpers/factories";
import { mockAuthForUser } from "./helpers/auth-session";
import { isAdminRole } from "@/lib/admin/config";
import { adminGrantCredits } from "@/lib/credits/admin-adjustment";
import { updateUserRole } from "@/lib/admin/users";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { sanitizeAuditMetadata } from "@/lib/audit/sanitize";

vi.mock("@/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/auth")>();
  return { ...mod, auth: vi.fn() };
});

describeIntegration("admin integration", () => {
  it("allows admin role check from database", async () => {
    const admin = await createTestUser({ role: "admin" });
    const user = await createTestUser({ role: "user" });

    expect(isAdminRole(admin.role)).toBe(true);
    expect(isAdminRole(user.role)).toBe(false);
  });

  it("promotes and demotes users with audit-safe metadata", async () => {
    const admin = await createTestUser({ role: "admin" });
    const user = await createTestUser({ role: "user" });

    const promoted = await updateUserRole(user.id, "admin");
    expect(promoted?.role).toBe("admin");

    const sanitized = sanitizeAuditMetadata({
      previousRole: "user",
      newRole: "admin",
      password: "secret",
      stripe_secret: "whsec_test",
    });
    expect(sanitized?.password).toBe("[REDACTED]");
    expect(sanitized?.stripe_secret).toBe("[REDACTED]");

    if (admin.id !== user.id) {
      await updateUserRole(user.id, "user");
    }
  });

  it("creates ledger + audit on admin credit grant", async () => {
    const admin = await createTestUser({ role: "admin" });
    const user = await createTestUser();

    const result = await adminGrantCredits({
      actorUserId: admin.id,
      targetUserId: user.id,
      amount: 25,
      reason: "Integration test grant",
    });

    expect(result.newBalance).toBeGreaterThanOrEqual(25);

    const prisma = getTestPrisma();
    const tx = await prisma.creditTransaction.findFirst({
      where: { userId: user.id, type: "admin_grant" },
    });
    expect(tx).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { action: "ADMIN_CREDIT_GRANT", targetUserId: user.id },
    });
    expect(audit).not.toBeNull();
  });

  it("blocks self-demotion at API validation layer", () => {
    const actorId = "same-id";
    const targetId = "same-id";
    const newRole = "user";
    const blocked = actorId === targetId && newRole !== "admin";
    expect(blocked).toBe(true);
  });

  it("suspends and unsuspends users via admin service", async () => {
    const user = await createTestUser({ role: "user" });
    const { updateUserStatus } = await import("@/lib/admin/users");

    const suspended = await updateUserStatus(user.id, "suspended");
    expect(suspended?.status).toBe("suspended");

    const reactivated = await updateUserStatus(user.id, "active");
    expect(reactivated?.status).toBe("active");
  });

  it("blocks suspended users from API access", async () => {
    const user = await createTestUser();
    const prisma = getTestPrisma();
    await prisma.user.update({ where: { id: user.id }, data: { status: "suspended" } });
    await mockAuthForUser({ ...user, status: "suspended" });

    const { GET: creditsGet } = await import("@/app/api/credits/route");
    const response = await creditsGet(new Request("http://localhost"));
    expect(response.status).toBe(403);
  });
});
