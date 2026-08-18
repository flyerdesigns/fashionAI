import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { generationService } from "@/lib/generation/service";
import { GenerationServiceError, USER_FACING_GENERATION_ERROR } from "@/lib/generation/errors";

interface RegenerateRequestBody {
  photoshootId?: string;
  imageId?: string;
  requestId?: string;
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as RegenerateRequestBody;

    if (!body.photoshootId || !body.imageId) {
      return NextResponse.json(
        { error: "Photoshoot ID and image ID are required." },
        { status: 400 },
      );
    }

    const result = await generationService.createRegenerateJob(authResult.user.id, {
      photoshootId: body.photoshootId,
      imageId: body.imageId,
      requestId: body.requestId,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof GenerationServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Regenerate route error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: USER_FACING_GENERATION_ERROR }, { status: 500 });
  }
}
