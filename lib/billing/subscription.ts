import { prisma } from "@/lib/db/client";
import type { PlanId } from "./plans";
import { getPlan, getPlanByStripePriceId } from "./plans";

export interface SubscriptionView {
  plan: PlanId;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

export async function getActiveSubscription(userId: string): Promise<SubscriptionView | null> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing", "past_due"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) return null;

  return mapSubscription(subscription);
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return "free";
  if (subscription.status === "active" || subscription.status === "trialing") {
    return subscription.plan;
  }
  return "free";
}

export async function upsertSubscriptionFromStripe(input: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}): Promise<void> {
  const plan = getPlanByStripePriceId(input.stripePriceId)?.id ?? "starter";

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: input.stripeSubscriptionId },
    create: {
      userId: input.userId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripePriceId: input.stripePriceId,
      plan,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      canceledAt: input.canceledAt,
    },
    update: {
      stripePriceId: input.stripePriceId,
      plan,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      canceledAt: input.canceledAt,
    },
  });
}

function mapSubscription(subscription: {
  plan: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}): SubscriptionView {
  return {
    plan: subscription.plan as PlanId,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
  };
}

export { getPlan };
