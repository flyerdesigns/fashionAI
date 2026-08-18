export type PlanId = "free" | "starter" | "pro" | "business";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  monthlyCredits: number;
  priceLabel: string;
  stripePriceId: string | null;
  features: string[];
}

function envPrice(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    monthlyCredits: 0,
    priceLabel: "$0",
    stripePriceId: null,
    features: ["Signup credits", "Pay-as-you-go with purchased plans"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthlyCredits: 500,
    priceLabel: "$29/mo",
    stripePriceId: envPrice("STRIPE_STARTER_PRICE_ID"),
    features: ["500 credits/month", "All photoshoot features", "Email support"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyCredits: 1500,
    priceLabel: "$79/mo",
    stripePriceId: envPrice("STRIPE_PRO_PRICE_ID"),
    features: ["1,500 credits/month", "Priority generation", "Email support"],
  },
  business: {
    id: "business",
    name: "Business",
    monthlyCredits: 5000,
    priceLabel: "$199/mo",
    stripePriceId: envPrice("STRIPE_BUSINESS_PRICE_ID"),
    features: ["5,000 credits/month", "Priority generation", "Dedicated support"],
  },
};

export const PAID_PLAN_IDS: PlanId[] = ["starter", "pro", "business"];

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

export function getPaidPlans(): PlanDefinition[] {
  return PAID_PLAN_IDS.map((id) => PLANS[id]).filter((plan) => plan.stripePriceId);
}

export function getPlanByStripePriceId(priceId: string): PlanDefinition | null {
  return Object.values(PLANS).find((plan) => plan.stripePriceId === priceId) ?? null;
}

export function getMonthlyCreditsForPlan(planId: PlanId): number {
  return PLANS[planId].monthlyCredits;
}
