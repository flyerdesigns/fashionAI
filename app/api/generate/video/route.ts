import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { mapVideoServiceError, videoService } from "@/lib/video/service";
import { USER_FACING_VIDEO_ERROR } from "@/lib/video/errors";
import type { VideoConfiguration, VideoSourceType } from "@/types/video";

interface GenerateVideoBody {
  title?: string;
  sourceType?: VideoSourceType;
  sourceStorageKey?: string;
  sourceImageId?: string;
  productId?: string;
  photoshootId?: string;
  configuration?: Partial<VideoConfiguration>;
  requestId?: string;
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as GenerateVideoBody;

    if (!body.sourceType || !body.sourceStorageKey?.trim()) {
      return NextResponse.json({ error: "Source image is required." }, { status: 400 });
    }

    const result = await videoService.createVideoJob(authResult.user.id, {
      title: body.title?.trim() || "Fashion Video",
      sourceType: body.sourceType,
      sourceStorageKey: body.sourceStorageKey.trim(),
      sourceImageId: body.sourceImageId,
      productId: body.productId,
      photoshootId: body.photoshootId,
      configuration: body.configuration,
      requestId: body.requestId,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const mapped = mapVideoServiceError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.statusCode });
  }
}

export async function GET() {
  return NextResponse.json({ error: USER_FACING_VIDEO_ERROR }, { status: 405 });
}
