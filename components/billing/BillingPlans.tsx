"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PlanDefinition, PlanId } from "@/lib/billing/plans";

interface BillingPlansProps {
  currentPlan: PlanId;
  plans: PlanDefinition[];
}

export function BillingPlans({ currentPlan, plans }: BillingPlansProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoadingPlan(planId);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start checkout.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to open billing portal.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing portal.");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <h3 className="font-display text-lg font-medium text-stone-900">{plan.name}</h3>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{plan.priceLabel}</p>
            <p className="mt-2 text-sm text-stone-500">
              {plan.monthlyCredits.toLocaleString()} credits / month
            </p>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={currentPlan === plan.id ? "outline" : "primary"}
              disabled={currentPlan === plan.id || loadingPlan === plan.id}
              loading={loadingPlan === plan.id}
              onClick={() => void handleUpgrade(plan.id)}
            >
              {currentPlan === plan.id ? "Current Plan" : "Upgrade"}
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={() => void handleManageBilling()}>
        Manage Billing
      </Button>
    </div>
  );
}
