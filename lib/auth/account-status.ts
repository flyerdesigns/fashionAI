import type { UserAccountStatus, UserRecord } from "@/types/user-record";

export const USER_ACCOUNT_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;

export function normalizeUserStatus(status: string | undefined | null): UserAccountStatus {
  return status === USER_ACCOUNT_STATUS.SUSPENDED
    ? USER_ACCOUNT_STATUS.SUSPENDED
    : USER_ACCOUNT_STATUS.ACTIVE;
}

export function isUserAccountActive(
  record: Pick<UserRecord, "status"> | { status?: string | null },
): boolean {
  return normalizeUserStatus(record.status) === USER_ACCOUNT_STATUS.ACTIVE;
}

/** API routes a suspended user may still call (billing recovery, sign-out). */
export function isSuspendedApiPathAllowed(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/billing/subscription" && method === "GET") return true;
  if (pathname === "/api/billing/portal" && method === "POST") return true;
  return false;
}

export function isSuspendedPageAllowed(pathname: string): boolean {
  return pathname === "/account-suspended" || pathname === "/settings/billing";
}
