import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { creditService } from "@/lib/credits/service";
import { isValidUuid } from "@/lib/admin/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  try {
    const usage = await creditService.listUsage(id, page, 50);
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
}
