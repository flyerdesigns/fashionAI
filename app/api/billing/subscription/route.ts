import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { billingService } from "@/lib/billing";
import { userFacingBillingMessage, BillingError } from "@/lib/billing/errors";

export async function GET() {
  const authResult = await requireApiUser({ allowSuspended: true });
  if ("response" in authResult) return authResult.response;

  try {
    const data = await billingService.getSubscription(authResult.user.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = userFacingBillingMessage(error);
    const status = error instanceof BillingError ? error.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
