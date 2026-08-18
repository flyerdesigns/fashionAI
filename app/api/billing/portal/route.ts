import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { billingService } from "@/lib/billing";
import { userFacingBillingMessage, BillingError } from "@/lib/billing/errors";

export async function POST() {
  const authResult = await requireApiUser({ allowSuspended: true });
  if ("response" in authResult) return authResult.response;

  try {
    const session = await billingService.createPortalSession(authResult.user.id);
    return NextResponse.json(session);
  } catch (error) {
    const message = userFacingBillingMessage(error);
    const status = error instanceof BillingError ? error.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
