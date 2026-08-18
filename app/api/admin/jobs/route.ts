import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { listAdminJobs } from "@/lib/admin/jobs";
import { parsePagination } from "@/lib/admin/helpers";
import type { AdminJobType } from "@/lib/admin/jobs";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams);
  const typeParam = searchParams.get("type");
  const type =
    typeParam === "image" || typeParam === "video" ? (typeParam as AdminJobType) : undefined;

  const result = await listAdminJobs({
    page,
    limit,
    type,
    status: searchParams.get("status") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    provider: searchParams.get("provider") ?? undefined,
  });

  return NextResponse.json(result);
}
