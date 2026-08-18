import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { generationService } from "@/lib/generation/service";
import { GenerationServiceError, USER_FACING_GENERATION_ERROR } from "@/lib/generation/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RetryRequestBody {
  requestId?: string;
}

export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as RetryRequestBody;

    const result = await generationService.createRetryFailedJob(
      authResult.user.id,
      id,
      body.requestId,
    );

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof GenerationServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Retry failed error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: USER_FACING_GENERATION_ERROR }, { status: 500 });
  }
}
