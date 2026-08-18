import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { adminRetryJob } from "@/lib/admin/jobs";
import { getRequestMeta, isValidUuid } from "@/lib/admin/helpers";
import type { AdminJobType } from "@/lib/admin/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  }

  let body: { type?: string } = {};
  try {
    body = (await request.json()) as { type?: string };
  } catch {
    // allow empty body with query param
  }

  const { searchParams } = new URL(request.url);
  const typeParam = body.type ?? searchParams.get("type");
  if (typeParam !== "image" && typeParam !== "video") {
    return NextResponse.json({ error: "type must be image or video." }, { status: 400 });
  }

  const meta = getRequestMeta(request);

  try {
    const result = await adminRetryJob({
      jobId: id,
      type: typeParam as AdminJobType,
      actorUserId: auth.user.id,
      ipAddress: meta.ipAddress,
      requestId: meta.requestId,
    });
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to retry job." },
      { status: 400 },
    );
  }
}
