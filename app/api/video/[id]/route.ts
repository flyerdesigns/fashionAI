import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { mapVideoServiceError, videoService } from "@/lib/video/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const video = await videoService.getVideoForUser(id, authResult.user.id);
    return NextResponse.json(video);
  } catch (error) {
    const mapped = mapVideoServiceError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.statusCode });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    await videoService.deleteVideo(id, authResult.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const mapped = mapVideoServiceError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.statusCode });
  }
}
