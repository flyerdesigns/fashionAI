import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getAdminPhotoshootDetail } from "@/lib/admin/photoshoots";
import { createAuditLog } from "@/lib/audit/service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getRequestMeta, isValidUuid } from "@/lib/admin/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid photoshoot ID." }, { status: 400 });
  }

  const detail = await getAdminPhotoshootDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Photoshoot not found." }, { status: 404 });
  }

  const meta = getRequestMeta(request);
  await createAuditLog({
    actorUserId: auth.user.id,
    action: AUDIT_ACTIONS.ADMIN_PHOTOSHOOT_VIEW,
    targetType: "photoshoot",
    targetId: id,
    targetUserId: detail.userId,
    ipAddress: meta.ipAddress,
    requestId: meta.requestId,
  });

  return NextResponse.json(detail);
}
