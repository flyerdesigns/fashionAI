import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { updateUserRole } from "@/lib/admin/users";
import { createAuditLog } from "@/lib/audit/service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getRequestMeta, isValidUuid } from "@/lib/admin/helpers";
import { userRepository } from "@/lib/users/repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const role = typeof body === "object" && body !== null && "role" in body
    ? (body as { role: unknown }).role
    : undefined;

  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "Role must be user or admin." }, { status: 400 });
  }

  if (id === auth.user.id && role !== "admin") {
    return NextResponse.json(
      { error: "You cannot demote your own admin account." },
      { status: 400 },
    );
  }

  const existing = await userRepository.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updated = await updateUserRole(id, role, existing.role);
  if (!updated) {
    return NextResponse.json({ error: "Unable to update user." }, { status: 500 });
  }

  const meta = getRequestMeta(request);
  await createAuditLog({
    actorUserId: auth.user.id,
    targetUserId: id,
    action: AUDIT_ACTIONS.ADMIN_USER_ROLE_CHANGE,
    targetType: "user",
    targetId: id,
    metadata: { previousRole: existing.role, newRole: role },
    ipAddress: meta.ipAddress,
    requestId: meta.requestId,
  });

  return NextResponse.json(updated);
}
