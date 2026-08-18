import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { photoshootService } from "@/lib/photoshoot/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const photoshoot = await photoshootService.getPhotoshootForUser(id, authResult.user.id);

    if (!photoshoot) {
      return NextResponse.json({ error: "Photoshoot not found." }, { status: 404 });
    }

    return NextResponse.json({ photoshoot });
  } catch {
    return NextResponse.json(
      { error: "Unable to load photoshoot. Please try again." },
      { status: 500 },
    );
  }
}
