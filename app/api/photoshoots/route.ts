import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { photoshootService } from "@/lib/photoshoot/service";

export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const photoshoots = await photoshootService.listPhotoshoots(authResult.user.id);
    return NextResponse.json({ photoshoots });
  } catch {
    return NextResponse.json(
      { error: "Unable to load photoshoots. Please try again." },
      { status: 500 },
    );
  }
}
