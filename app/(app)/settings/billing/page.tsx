import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { creditService } from "@/lib/credits";
import { billingService, getPlan } from "@/lib/billing";
import { BillingPlans } from "@/components/billing/BillingPlans";
import { formatDate } from "@/lib/utils";
import { isPostgresEnabled } from "@/lib/db/config";
import type { PlanId } from "@/lib/billing/plans";

interface BillingPageProps {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}

export default async function BillingSettingsPage({ searchParams }: BillingPageProps) {
  const user = await requireUser({ allowSuspended: true });
  const params = await searchParams;

  const balance = isPostgresEnabled()
    ? await creditService.getBalance(user.id)
    : { balance: 0, reserved: 0, available: 0, lifetimeGranted: 0, lifetimeConsumed: 0 };

  const { subscription, plan } = isPostgresEnabled()
    ? await billingService.getSubscription(user.id)
    : { subscription: null, plan: "free" as PlanId };

  const planDef = getPlan(plan);

  return (
    <>
      <PageHeader
        title="Billing"
        description="Manage your plan, credits, and subscription."
        actions={<Button variant="outline" href="/settings">Back to Settings</Button>}
      />

      <div className="mx-auto max-w-5xl space-y-6">
        {params.success === "true" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Checkout completed. Your subscription will update once Stripe confirms payment.
          </div>
        )}
        {params.cancelled === "true" && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            Checkout was cancelled. No changes were made.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-500">Available credits</p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">
              {balance.available.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-500">Reserved</p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">
              {balance.reserved.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-500">Current plan</p>
            <p className="mt-2 text-3xl font-semibold capitalize text-stone-900">
              {planDef.name}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-medium text-stone-900">Subscription</h2>
          {subscription ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Status</dt>
                <dd className="font-medium capitalize text-stone-900">{subscription.status}</dd>
              </div>
              {subscription.currentPeriodEnd && (
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Renews / ends</dt>
                  <dd className="font-medium text-stone-900">
                    {formatDate(subscription.currentPeriodEnd)}
                  </dd>
                </div>
              )}
              {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                <p className="text-sm text-amber-700">
                  Your subscription will cancel on {formatDate(subscription.currentPeriodEnd)}.
                </p>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-stone-500">
              You are on the free plan. Upgrade below to receive monthly credits.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-medium text-stone-900">Plans</h2>
          <div className="mt-6">
            <BillingPlans currentPlan={plan} />
          </div>
        </section>
      </div>
    </>
  );
}
