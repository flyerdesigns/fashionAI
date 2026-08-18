import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { adminAdjustCredits } from "@/lib/credits/admin-adjustment";
import { CreditsError, userFacingCreditsMessage } from "@/lib/credits/errors";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { targetUserId, amount, reason } = body as Record<string, unknown>;

  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
  }

  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "amount must be an integer." }, { status: 400 });
  }

  if (typeof reason !== "string") {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  try {
    const result = await adminAdjustCredits({
      actorUserId: auth.user.id,
      targetUserId: targetUserId.trim(),
      amount,
      reason,
      ipAddress,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CreditsError) {
      return NextResponse.json(
        { error: userFacingCreditsMessage(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Unable to adjust credits." }, { status: 500 });
  }
}
