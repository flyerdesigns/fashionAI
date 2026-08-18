import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getAdminVideoDetail } from "@/lib/admin/videos";
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
    return NextResponse.json({ error: "Invalid video ID." }, { status: 400 });
  }

  const detail = await getAdminVideoDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  const meta = getRequestMeta(request);
  await createAuditLog({
    actorUserId: auth.user.id,
    action: AUDIT_ACTIONS.ADMIN_VIDEO_VIEW,
    targetType: "video",
    targetId: id,
    targetUserId: detail.userId,
    ipAddress: meta.ipAddress,
    requestId: meta.requestId,
  });

  return NextResponse.json(detail);
}
