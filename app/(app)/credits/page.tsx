import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { creditService } from "@/lib/credits";
import { isPostgresEnabled } from "@/lib/db/config";
import { CreditsHistory } from "@/components/credits/CreditsHistory";

export default async function CreditsPage() {
  const user = await requireUser();

  const balance = isPostgresEnabled()
    ? await creditService.getBalance(user.id)
    : {
        balance: 0,
        reserved: 0,
        available: 0,
        lifetimeGranted: 0,
        lifetimeConsumed: 0,
      };

  const usage = isPostgresEnabled()
    ? await creditService.listUsage(user.id, 1, 20)
    : { items: [], page: 1, limit: 20, total: 0, hasMore: false };

  return (
    <>
      <PageHeader
        title="Credits"
        description="Track your AI generation credits and usage history."
        actions={<Button variant="outline" href="/settings/billing">Manage Billing</Button>}
      />

      <div className="grid max-w-4xl gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">Available</p>
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
          <p className="text-sm text-stone-500">Lifetime used</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {balance.lifetimeConsumed.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-4xl">
        <CreditsHistory initialUsage={usage.items} />
      </div>
    </>
  );
}
