import type Stripe from "stripe";

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

export function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: number;
  periodEnd: number;
} {
  const item = subscription.items.data[0];
  return {
    periodStart: item?.current_period_start ?? subscription.billing_cycle_anchor,
    periodEnd: item?.current_period_end ?? subscription.billing_cycle_anchor,
  };
}
