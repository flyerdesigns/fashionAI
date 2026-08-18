import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireApiUser, requireUser } from "@/lib/auth/service";
import { userRepository } from "@/lib/users/repository";
import type { UserRole } from "./config";
import { isAdminRole } from "./config";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAdminUser(): Promise<
  Awaited<ReturnType<typeof requireUser>> & { role: UserRole }
> {
  const user = await requireUser();
  const record = await userRepository.findById(user.id);
  if (!record || !isAdminRole(record.role)) {
    redirect("/dashboard");
  }
  return { ...user, role: record.role as UserRole };
}

export async function requireAdminApi(): Promise<
  | { user: Awaited<ReturnType<typeof requireUser>>; role: UserRole }
  | { response: NextResponse }
> {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult;

  const record = await userRepository.findById(authResult.user.id);
  if (!record || !isAdminRole(record.role)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: authResult.user, role: record.role as UserRole };
}
