import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { updateUserStatus } from "@/lib/admin/users";
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

  const status =
    typeof body === "object" && body !== null && "status" in body
      ? (body as { status: unknown }).status
      : undefined;

  if (status !== "active" && status !== "suspended") {
    return NextResponse.json({ error: "Status must be active or suspended." }, { status: 400 });
  }

  if (id === auth.user.id && status === "suspended") {
    return NextResponse.json(
      { error: "You cannot suspend your own admin account." },
      { status: 400 },
    );
  }

  const existing = await userRepository.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (existing.status === status) {
    return NextResponse.json({ error: `User is already ${status}.` }, { status: 400 });
  }

  const updated = await updateUserStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Unable to update user status." }, { status: 500 });
  }

  const meta = getRequestMeta(request);
  await createAuditLog({
    actorUserId: auth.user.id,
    targetUserId: id,
    action:
      status === "suspended"
        ? AUDIT_ACTIONS.ADMIN_USER_SUSPEND
        : AUDIT_ACTIONS.ADMIN_USER_UNSUSPEND,
    targetType: "user",
    targetId: id,
    metadata: { previousStatus: existing.status, newStatus: status },
    ipAddress: meta.ipAddress,
    requestId: meta.requestId,
  });

  return NextResponse.json(updated);
}
