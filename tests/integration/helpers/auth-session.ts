import { vi } from "vitest";
import type { Session } from "next-auth";

export function buildAuthSession(user: {
  id: string;
  email: string;
  name: string;
  role?: string;
  status?: string;
}): Session {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? "user",
      status: user.status ?? "active",
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

export async function mockAuthForUser(user: {
  id: string;
  email: string;
  name: string;
  role?: string;
  status?: string;
}): Promise<void> {
  const { auth } = await import("@/auth");
  vi.mocked(auth).mockResolvedValue(buildAuthSession(user));
}
