export type UserRole = "user" | "admin";

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin";
}

export function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isBootstrapAdminEmail(email: string): boolean {
  const admins = parseAdminEmails();
  if (admins.size === 0) return false;
  return admins.has(email.trim().toLowerCase());
}

export function resolveRoleForEmail(email: string, existingRole?: UserRole): UserRole {
  if (existingRole === "admin") return "admin";
  if (isBootstrapAdminEmail(email)) return "admin";
  return existingRole ?? "user";
}
