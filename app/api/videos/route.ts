import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { mapVideoServiceError, videoService } from "@/lib/video/service";
import type { VideoStatus } from "@/types/video";

export async function GET(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as VideoStatus | "all" | null;
    const search = url.searchParams.get("search") ?? undefined;
    const sort = (url.searchParams.get("sort") as "newest" | "oldest" | null) ?? "newest";
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "24", 10);

    const result = await videoService.listVideos(authResult.user.id, {
      status: status ?? "all",
      search,
      sort,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    const mapped = mapVideoServiceError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.statusCode });
  }
}
