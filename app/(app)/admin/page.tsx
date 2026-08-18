import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { getAdminDashboardStats } from "@/lib/admin/stats";

function statusLabel(value: string): string {
  if (value === "unavailable") return "Unavailable";
  return value;
}

export default async function AdminOverviewPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Admin Overview</h1>
        <p className="mt-1 text-sm text-stone-500">Real-time platform metrics from the database.</p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Users</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value={stats.users.total} />
          <StatCard label="New Today" value={stats.users.newToday} />
          <StatCard label="New This Week" value={stats.users.newThisWeek} />
          <StatCard
            label="Active (30d)"
            value={stats.users.activeUsers ?? 0}
            suffix={stats.users.activeUsers === null ? undefined : undefined}
          />
        </div>
        {stats.users.activeUsers === null && (
          <p className="mt-2 text-xs text-stone-500">Active users unavailable without PostgreSQL.</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Billing</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Active Subscriptions" value={stats.billing.activeSubscriptions} />
          <StatCard label="Free Users" value={stats.billing.freeUsers} />
          <StatCard label="Starter" value={stats.billing.starterUsers} />
          <StatCard label="Pro" value={stats.billing.proUsers} />
          <StatCard label="Business" value={stats.billing.businessUsers} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Credits</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Lifetime Granted" value={stats.credits.totalGranted} />
          <StatCard label="Lifetime Consumed" value={stats.credits.totalConsumed} />
          <StatCard label="Available" value={stats.credits.totalAvailable} />
          <StatCard label="Reserved" value={stats.credits.totalReserved} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Generation</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Photoshoots" value={stats.generation.totalPhotoshoots} />
          <StatCard label="Generated Images" value={stats.generation.totalGeneratedImages} />
          <StatCard label="Queued Jobs" value={stats.generation.queuedJobs} />
          <StatCard label="Processing" value={stats.generation.processingJobs} />
          <StatCard label="Completed Jobs" value={stats.generation.completedJobs} />
          <StatCard label="Failed Jobs" value={stats.generation.failedJobs} />
          <StatCard label="Partial Failures" value={stats.generation.partiallyFailedJobs} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">Video</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Videos" value={stats.video.totalVideos} />
          <StatCard label="Queued" value={stats.video.queuedJobs} />
          <StatCard label="Processing" value={stats.video.processingJobs} />
          <StatCard label="Completed" value={stats.video.completedVideos} />
          <StatCard label="Failed" value={stats.video.failedVideos} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">System</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Database", stats.system.database],
              ["Storage", stats.system.storage],
              ["Image Worker", stats.system.generationWorker],
              ["Video Worker", stats.system.videoWorker],
            ] as const
          ).map(([name, status]) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <span className="text-sm font-medium text-stone-700">{name}</span>
              <Badge variant={status === "ok" || status === "not_configured" ? "success" : "warning"}>
                {statusLabel(status)}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
