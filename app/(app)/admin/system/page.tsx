import { getWorkerHeartbeats } from "@/lib/admin/service";
import { getReadinessCheck } from "@/lib/health/checks";
import { Badge } from "@/components/ui/Badge";

export default async function AdminSystemPage() {
  const [workers, health] = await Promise.all([
    getWorkerHeartbeats(),
    getReadinessCheck(),
  ]);

  const checks = Object.entries(health.services).map(([name, status]) => ({
    name,
    status,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">System Health</h1>
        <p className="mt-1 text-sm text-stone-500">
          Worker heartbeats and infrastructure readiness.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">
          Readiness Checks
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <span className="text-sm font-medium text-stone-700">{check.name}</span>
              <Badge variant={check.status === "ok" ? "success" : "warning"}>
                {check.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">
          Worker Heartbeats
        </h2>
        {workers.length === 0 ? (
          <p className="text-sm text-stone-500">
            No worker heartbeats recorded. Workers write heartbeats when PostgreSQL is enabled.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-100 bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Worker</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Seen</th>
                  <th className="px-4 py-3 font-medium">Stale</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.workerName} className="border-b border-stone-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{worker.workerName}</p>
                      <p className="font-mono text-xs text-stone-500">{worker.workerId}</p>
                    </td>
                    <td className="px-4 py-3">{worker.status}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(worker.lastSeenAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={worker.stale ? "warning" : "success"}>
                        {worker.stale ? "stale" : "alive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
