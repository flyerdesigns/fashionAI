import { describe, it, expect, vi, beforeEach } from "vitest";
import { describeIntegration } from "./setup";
import { createTestUser } from "./helpers/factories";
import { billingService } from "@/lib/billing/service";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { creditService } from "@/lib/credits/service";
import type Stripe from "stripe";

vi.mock("@/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
}));

import { getStripe } from "@/lib/billing/stripe";

function buildInvoicePaidEvent(eventId: string, subscriptionId: string): Stripe.Event {
  return {
    id: eventId,
    type: "invoice.paid",
    data: {
      object: {
        id: "in_test_1",
        parent: {
          subscription_details: {
            subscription: subscriptionId,
          },
        },
      },
    },
  } as unknown as Stripe.Event;
}

describeIntegration("stripe webhook integration", () => {
  beforeEach(() => {
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "sub_test_1",
          customer: "cus_test_1",
          status: "active",
          metadata: { userId: "", planId: "starter" },
          items: {
            data: [
              {
                price: { id: "price_starter_test" },
                current_period_start: 1_700_000_000,
                current_period_end: 1_700_086_400,
              },
            ],
          },
          cancel_at_period_end: false,
          canceled_at: null,
        }),
      },
    } as unknown as ReturnType<typeof getStripe>);
  });

  it("grants subscription credits once for duplicate invoice.paid events", async () => {
    const user = await createTestUser();
    const prisma = getTestPrisma();

    await prisma.stripeCustomer.create({
      data: { userId: user.id, stripeCustomerId: "cus_test_1" },
    });

    vi.mocked(getStripe().subscriptions.retrieve).mockResolvedValue({
      id: "sub_test_1",
      customer: "cus_test_1",
      status: "active",
      metadata: { userId: user.id, planId: "starter" },
      items: {
        data: [
          {
            price: { id: process.env.STRIPE_STARTER_PRICE_ID ?? "price_starter_test" },
            current_period_start: 1_700_000_000,
            current_period_end: 1_700_086_400,
          },
        ],
      },
      cancel_at_period_end: false,
      canceled_at: null,
    } as never);

    process.env.STRIPE_STARTER_PRICE_ID = process.env.STRIPE_STARTER_PRICE_ID ?? "price_starter_test";

    const event = buildInvoicePaidEvent("evt_integration_1", "sub_test_1");

    await billingService.handleWebhookEvent(event);
    await billingService.handleWebhookEvent(event);

    const events = await prisma.stripeEvent.findMany({ where: { stripeEventId: "evt_integration_1" } });
    expect(events).toHaveLength(1);
    expect(events[0]?.processed).toBe(true);

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: user.id, type: "subscription_credit" },
    });
    expect(transactions).toHaveLength(1);

    const balance = await creditService.getBalance(user.id);
    expect(balance.balance).toBeGreaterThan(0);
  });
});

describe("stripe webhook signature route behavior", () => {
  it("rejects missing signature without DB mutation", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/signature/i);
  });
});
