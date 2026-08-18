import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { listAuditLogs } from "@/lib/audit/service";
import { parsePagination } from "@/lib/admin/helpers";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams, { limit: 50 });

  const result = await listAuditLogs({
    page,
    limit,
    action: searchParams.get("action") ?? undefined,
    actorUserId: searchParams.get("actorUserId") ?? searchParams.get("admin") ?? undefined,
    targetType: searchParams.get("targetType") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  return NextResponse.json(result);
}
