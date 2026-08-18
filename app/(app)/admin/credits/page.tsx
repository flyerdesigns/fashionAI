import { AdminCreditsPanel } from "@/components/admin/AdminCreditsPanel";

export default function AdminCreditsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Credit Management</h1>
        <p className="mt-1 text-sm text-stone-500">
          Grant, deduct, or refund credits with audited ledger entries.
        </p>
      </div>
      <AdminCreditsPanel />
    </div>
  );
}
