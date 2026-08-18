import { NextResponse } from "next/server";
import { billingService } from "@/lib/billing";
import { getStripeWebhookSecret } from "@/lib/billing/config";
import { getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();

  try {
    const event = getStripe().webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    );

    await billingService.handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook verification failed." }, { status: 400 });
  }
}
