import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { billingService } from "@/lib/billing";
import { userFacingBillingMessage, BillingError } from "@/lib/billing/errors";

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as { plan?: string };
    if (!body.plan?.trim()) {
      return NextResponse.json({ error: "Plan is required." }, { status: 400 });
    }

    const session = await billingService.createCheckoutSession(
      authResult.user.id,
      authResult.user.email,
      authResult.user.name,
      body.plan.trim(),
    );

    return NextResponse.json(session);
  } catch (error) {
    const message = userFacingBillingMessage(error);
    const status = error instanceof BillingError ? error.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
