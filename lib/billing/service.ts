import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db/client";
import { creditService } from "@/lib/credits/service";
import { LOG_EVENTS } from "@/lib/logging/events";
import { logger } from "@/lib/logging/logger";
import { metrics } from "@/lib/metrics";
import { getMonthlyCreditsForPlan, getPlan, getPlanByStripePriceId, isPlanId, type PlanId } from "./plans";
import { getAppUrl, isStripeConfigured } from "./config";
import { BillingError } from "./errors";
import { getStripe } from "./stripe";
import { getInvoiceSubscriptionId, getSubscriptionPeriod } from "./stripe-utils";
import { getActiveSubscription, getUserPlan, upsertSubscriptionFromStripe } from "./subscription";
import type Stripe from "stripe";

export class BillingService {
  async getOrCreateStripeCustomer(userId: string, email: string, name: string): Promise<string> {
    const existing = await prisma.stripeCustomer.findUnique({ where: { userId } });
    if (existing) return existing.stripeCustomerId;

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });

    await prisma.stripeCustomer.create({
      data: { userId, stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async createCheckoutSession(userId: string, email: string, name: string, planId: string) {
    if (!isStripeConfigured()) {
      throw new BillingError("Billing is not configured.", "billing_not_configured", 503);
    }
    if (!isPlanId(planId) || planId === "free") {
      throw new BillingError("Invalid plan selected.", "invalid_plan");
    }

    const plan = getPlan(planId);
    if (!plan.stripePriceId) {
      throw new BillingError("This plan is not available for checkout.", "invalid_plan");
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, email, name);
    const appUrl = getAppUrl();

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?cancelled=true`,
      metadata: { userId, planId },
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    if (!session.url) {
      throw new BillingError("Unable to create checkout session.", "checkout_failed", 500);
    }

    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    if (!isStripeConfigured()) {
      throw new BillingError("Billing is not configured.", "billing_not_configured", 503);
    }

    const customer = await prisma.stripeCustomer.findUnique({ where: { userId } });
    if (!customer) {
      throw new BillingError("No billing account found.", "no_customer", 404);
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${getAppUrl()}/settings/billing`,
    });

    return { url: session.url };
  }

  async getSubscription(userId: string) {
    const [subscription, plan] = await Promise.all([
      getActiveSubscription(userId),
      getUserPlan(userId),
    ]);
    return { subscription, plan };
  }

  /**
   * Authoritative monthly credit grant happens on invoice.paid for subscription cycles.
   * checkout.session.completed only ensures subscription records exist.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const existing = await prisma.stripeEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing?.processed) return;

    logger.info(LOG_EVENTS.STRIPE_WEBHOOK_RECEIVED, { event: event.type, stripeEventId: event.id });

    try {
      await prisma.stripeEvent.upsert({
        where: { stripeEventId: event.id },
        create: {
          stripeEventId: event.id,
          type: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
        },
        update: {},
      });

      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case "invoice.paid":
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          break;
      }

      await prisma.stripeEvent.update({
        where: { stripeEventId: event.id },
        data: { processed: true, processedAt: new Date() },
      });

      metrics.stripeWebhookSuccessTotal.inc({ type: event.type });
      metrics.stripeWebhookTotal.inc({ type: event.type });
      logger.info(LOG_EVENTS.STRIPE_WEBHOOK_COMPLETED, { event: event.type, stripeEventId: event.id });
    } catch (error) {
      metrics.stripeWebhookFailureTotal.inc({ type: event.type });
      logger.error(LOG_EVENTS.STRIPE_WEBHOOK_FAILED, {
        event: event.type,
        stripeEventId: event.id,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId || !session.subscription || !session.customer) return;

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
    await this.syncStripeSubscription(userId, subscription);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      const customerId = String(subscription.customer);
      const mapped = await prisma.stripeCustomer.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!mapped) return;
      await this.syncStripeSubscription(mapped.userId, subscription);
      return;
    }
    await this.syncStripeSubscription(userId, subscription);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "canceled",
        canceledAt: new Date(),
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = getInvoiceSubscriptionId(invoice);
    if (!subscriptionId) return;

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;
    if (!userId) {
      const customer = await prisma.stripeCustomer.findFirst({
        where: { stripeCustomerId: String(subscription.customer) },
      });
      if (!customer) return;
      await this.grantMonthlyCredits(customer.userId, subscription, invoice.id);
      await this.syncStripeSubscription(customer.userId, subscription);
      return;
    }

    await this.grantMonthlyCredits(userId, subscription, invoice.id);
    await this.syncStripeSubscription(userId, subscription);
  }

  private async grantMonthlyCredits(
    userId: string,
    subscription: Stripe.Subscription,
    invoiceId: string | null,
  ) {
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) return;

    const planId =
      (subscription.metadata?.planId as PlanId | undefined) ??
      getPlanByStripePriceId(priceId)?.id;
    if (!planId || planId === "free") return;

    const { periodStart } = getSubscriptionPeriod(subscription);
    const referenceId = `subscription:${subscription.id}:${periodStart}`;

    await creditService.grant({
      userId,
      amount: getMonthlyCreditsForPlan(planId),
      type: "subscription_credit",
      referenceType: "subscription_period",
      referenceId,
      description: `${getPlan(planId).name} monthly credits`,
      metadata: {
        stripeSubscriptionId: subscription.id,
        invoiceId,
        periodStart,
      },
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = getInvoiceSubscriptionId(invoice);
    if (!subscriptionId) return;
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "past_due" },
    });
  }

  private async syncStripeSubscription(userId: string, subscription: Stripe.Subscription) {
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) return;

    const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

    await upsertSubscriptionFromStripe({
      userId,
      stripeCustomerId: String(subscription.customer),
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    });
  }
}

export const billingService = new BillingService();

export { getUserPlan, getActiveSubscription };
