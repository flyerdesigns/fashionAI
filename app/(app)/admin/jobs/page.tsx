import Link from "next/link";
import { listAdminJobs } from "@/lib/admin/jobs";
import { Badge } from "@/components/ui/Badge";

export default async function AdminJobsPage() {
  const { items } = await listAdminJobs({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Job Monitor</h1>
        <p className="mt-1 text-sm text-stone-500">Image and video generation jobs.</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-stone-500">No jobs found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={`${job.type}-${job.id}`} className="border-b border-stone-50 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/jobs/${job.id}?type=${job.type}`}
                      className="font-mono text-xs text-stone-700 hover:underline"
                    >
                      {job.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{job.userEmail}</td>
                  <td className="px-4 py-3 capitalize">{job.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={job.status === "failed" ? "warning" : "muted"}>{job.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{job.credits ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-red-600">{job.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
