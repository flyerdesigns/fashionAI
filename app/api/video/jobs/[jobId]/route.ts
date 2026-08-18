import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { mapVideoServiceError, videoService } from "@/lib/video/service";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { jobId } = await params;
    const status = await videoService.getJobStatusForUser(jobId, authResult.user.id);
    return NextResponse.json(status);
  } catch (error) {
    const mapped = mapVideoServiceError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.statusCode });
  }
}
