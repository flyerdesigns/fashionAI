import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminJobDetail } from "@/lib/admin/jobs";
import { AdminJobActions } from "@/components/admin/AdminJobActions";
import { Badge } from "@/components/ui/Badge";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
  params: Promise<{ id: string }>;
}

export default async function AdminJobDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { type } = await searchParams;

  if (type !== "image" && type !== "video") {
    notFound();
  }

  const detail = await getAdminJobDetail(id, type);
  if (!detail) notFound();

  const job = detail.job;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/jobs" className="text-sm text-stone-500 hover:text-stone-800">
          ← Back to jobs
        </Link>
        <h1 className="mt-2 font-display text-2xl font-medium text-stone-900">Job Detail</h1>
        <p className="mt-1 font-mono text-xs text-stone-500">{id}</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <Info label="Type" value={type} />
        <Info label="Status" value={<Badge variant="muted">{job.status}</Badge>} />
        <Info label="User" value={"user" in job ? job.user.email : "—"} />
        <Info label="Provider" value={job.provider} />
        <Info label="Progress" value={`${job.progress}%`} />
        {"attempts" in job && <Info label="Attempts" value={String(job.attempts)} />}
        {"error" in job && job.error && <Info label="Error" value={job.error} />}
        {"errorMessage" in job && job.errorMessage && (
          <Info label="Error" value={job.errorMessage} />
        )}
      </div>

      <AdminJobActions jobId={id} jobType={type} status={job.status} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <div className="mt-1 text-sm text-stone-800">{value}</div>
    </div>
  );
}
