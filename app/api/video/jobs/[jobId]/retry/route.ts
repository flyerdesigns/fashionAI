import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { mapVideoServiceError, videoService } from "@/lib/video/service";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { jobId } = await params;
    const result = await videoService.retryJob(jobId, authResult.user.id);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const mapped = mapVideoServiceError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.statusCode });
  }
}
