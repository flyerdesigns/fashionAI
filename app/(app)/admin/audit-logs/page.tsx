import { listAuditLogs } from "@/lib/audit/service";

export default async function AdminAuditLogsPage() {
  const { items } = await listAuditLogs({ page: 1, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-stone-500">Admin actions and sensitive operations.</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-200 px-6 py-12 text-center text-sm text-stone-500">
          No audit entries yet. PostgreSQL is required for persistent audit logs.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Request ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className="border-b border-stone-50 last:border-0">
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">{entry.actorEmail ?? entry.actorUserId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{entry.action}</td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    {entry.targetType ?? "—"}
                    {entry.targetId ? ` / ${entry.targetId.slice(0, 8)}…` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-400">
                    {entry.requestId?.slice(0, 12) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
