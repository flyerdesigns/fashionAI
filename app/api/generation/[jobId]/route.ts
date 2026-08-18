import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { generationService } from "@/lib/generation/service";
import { GenerationServiceError, USER_FACING_GENERATION_ERROR } from "@/lib/generation/errors";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { jobId } = await params;
    const status = await generationService.getJobStatus(jobId, authResult.user.id);
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof GenerationServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Job status error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: USER_FACING_GENERATION_ERROR }, { status: 500 });
  }
}
