import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { creditService } from "@/lib/credits";
import { isPostgresEnabled } from "@/lib/db/config";

export async function GET(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  if (!isPostgresEnabled()) {
    return NextResponse.json({ items: [], page: 1, limit: 20, total: 0, hasMore: false });
  }

  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);

  const result = await creditService.listUsage(authResult.user.id, page, limit);
  return NextResponse.json(result);
}
