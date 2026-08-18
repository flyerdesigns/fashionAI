import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getAdminJobDetail } from "@/lib/admin/jobs";
import { createAuditLog } from "@/lib/audit/service";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getRequestMeta, isValidUuid } from "@/lib/admin/helpers";
import type { AdminJobType } from "@/lib/admin/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  if (typeParam !== "image" && typeParam !== "video") {
    return NextResponse.json({ error: "Query param type=image|video is required." }, { status: 400 });
  }

  const detail = await getAdminJobDetail(id, typeParam as AdminJobType);
  if (!detail) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const meta = getRequestMeta(request);
  await createAuditLog({
    actorUserId: auth.user.id,
    action: AUDIT_ACTIONS.ADMIN_JOB_VIEW,
    targetType: typeParam === "image" ? "generation_job" : "video_generation_job",
    targetId: id,
    targetUserId: detail.job.userId,
    ipAddress: meta.ipAddress,
    requestId: meta.requestId,
  });

  return NextResponse.json(detail);
}
