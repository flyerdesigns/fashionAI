import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { listAdminVideos } from "@/lib/admin/videos";
import { parsePagination } from "@/lib/admin/helpers";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams);

  const result = await listAdminVideos({
    page,
    limit,
    status: searchParams.get("status") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
  });

  return NextResponse.json(result);
}
