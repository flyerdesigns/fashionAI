import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { generationService } from "@/lib/generation/service";
import { GenerationServiceError, USER_FACING_GENERATION_ERROR } from "@/lib/generation/errors";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { jobId } = await params;
    const job = await generationService.cancelJob(jobId, authResult.user.id);
    return NextResponse.json({
      jobId: job.id,
      photoshootId: job.photoshootId,
      status: job.status,
    });
  } catch (error) {
    if (error instanceof GenerationServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Cancel job error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: USER_FACING_GENERATION_ERROR }, { status: 500 });
  }
}
