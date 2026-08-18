import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { User } from "@/types";
import type { UserRecord } from "@/types/user-record";
import { userRepository } from "@/lib/users/repository";
import { credits } from "@/lib/credits";
import { getUserPlan } from "@/lib/billing";
import { isPostgresEnabled } from "@/lib/db/config";
import { isUserAccountActive } from "@/lib/auth/account-status";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function toAppUser(record: UserRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    avatarUrl: record.image ?? undefined,
    plan: "free",
    creditsRemaining: 0,
    role: record.role,
    status: record.status,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const record = await userRepository.findById(session.user.id);
  if (!record) return null;

  const user = toAppUser(record);
  if (isPostgresEnabled()) {
    const [balance, plan] = await Promise.all([
      credits.getBalance(record.id),
      getUserPlan(record.id),
    ]);
    user.creditsRemaining = balance.remaining;
    user.plan = plan;
  }
  return user;
}

export async function requireUser(options?: { allowSuspended?: boolean }): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!options?.allowSuspended && !isUserAccountActive(user)) {
    redirect("/account-suspended");
  }
  return user;
}

export async function requireApiUser(options?: {
  allowSuspended?: boolean;
}): Promise<{ user: User } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!options?.allowSuspended && !isUserAccountActive(user)) {
    return {
      response: NextResponse.json({ error: "Account suspended." }, { status: 403 }),
    };
  }
  return { user };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  return userRepository.findByEmail(email);
}

export { toAppUser };
