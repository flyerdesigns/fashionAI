import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { listAdminUsers } from "@/lib/admin/users";
import { parsePagination } from "@/lib/admin/helpers";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const role = searchParams.get("role") ?? undefined;
  const plan = searchParams.get("plan") ?? undefined;
  const sort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";

  const result = await listAdminUsers({ page, limit, search, role, plan, sort });
  return NextResponse.json(result);
}
