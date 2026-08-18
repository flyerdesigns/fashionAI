import { NextResponse } from "next/server";
import type { PhotoshootConfiguration } from "@/types/photoshoot-config";
import { requireApiUser } from "@/lib/auth";
import { generationService } from "@/lib/generation/service";
import { GenerationServiceError, USER_FACING_GENERATION_ERROR } from "@/lib/generation/errors";

interface GenerateRequestBody {
  productId?: string;
  configuration?: PhotoshootConfiguration;
  numberOfImages?: number;
  requestId?: string;
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as GenerateRequestBody;

    if (!body.productId?.trim()) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    if (!body.configuration) {
      return NextResponse.json({ error: "Photoshoot configuration is required." }, { status: 400 });
    }

    const result = await generationService.createPhotoshootJob(authResult.user.id, {
      productId: body.productId.trim(),
      configuration: body.configuration,
      numberOfImages: body.numberOfImages,
      requestId: body.requestId,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof GenerationServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Generate route error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: USER_FACING_GENERATION_ERROR }, { status: 500 });
  }
}
