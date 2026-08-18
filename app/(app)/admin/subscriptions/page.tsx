import { listAdminSubscriptions } from "@/lib/admin/subscriptions";
import { Badge } from "@/components/ui/Badge";

export default async function AdminSubscriptionsPage() {
  const { items } = await listAdminSubscriptions({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Subscriptions</h1>
        <p className="mt-1 text-sm text-stone-500">Read-only Stripe subscription visibility.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">No subscriptions.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Period end</th>
                <th className="px-4 py-3 text-left">Cancel at end</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">{row.userEmail}</td>
                  <td className="px-4 py-3 capitalize">{row.plan}</td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.currentPeriodEnd
                      ? new Date(row.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{row.cancelAtPeriodEnd ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
