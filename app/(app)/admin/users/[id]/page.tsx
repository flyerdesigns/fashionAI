import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/lib/admin/users";
import { AdminUserRoleActions } from "@/components/admin/AdminUserRoleActions";
import { AdminUserStatusActions } from "@/components/admin/AdminUserStatusActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminUserDetail(id);
  if (!detail) notFound();

  const { profile } = detail;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="text-sm text-stone-500 hover:text-stone-800">
          ← Back to users
        </Link>
        <h1 className="mt-2 font-display text-2xl font-medium text-stone-900">{profile.name}</h1>
        <p className="text-sm text-stone-500">{profile.email}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Role" value={profile.role} />
        <Card label="Status" value={profile.status} />
        <Card label="Plan" value={profile.subscriptionPlan} />
        <Card label="Credits" value={String(profile.creditBalance ?? "—")} />
        <Card label="Reserved" value={String(profile.creditReserved ?? "—")} />
      </section>

      <AdminUserRoleActions userId={profile.id} currentRole={profile.role} />
      <AdminUserStatusActions userId={profile.id} currentStatus={profile.status} />

      <Section title="Recent credit transactions">
        {detail.creditTransactions.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={["Type", "Amount", "Balance After", "Date"]}
            rows={detail.creditTransactions.map((tx) => [
              tx.type,
              String(tx.amount),
              String(tx.balanceAfter),
              new Date(tx.createdAt).toLocaleString(),
            ])}
          />
        )}
      </Section>

      <Section title="Recent usage">
        {detail.usage.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={["Operation", "Credits", "Status", "Date"]}
            rows={detail.usage.map((u) => [
              u.operation,
              String(u.credits),
              u.status,
              new Date(u.createdAt).toLocaleString(),
            ])}
          />
        )}
      </Section>

      <Section title="Photoshoots">
        <Table
          headers={["ID", "Status", "Images", "Created"]}
          rows={detail.photoshoots.map((p) => [
            p.id.slice(0, 8) + "…",
            p.status,
            String(p.totalImages),
            new Date(p.createdAt).toLocaleDateString(),
          ])}
        />
      </Section>

      <Section title="Videos">
        <Table
          headers={["Title", "Status", "Duration", "Created"]}
          rows={detail.videos.map((v) => [
            v.title,
            v.status,
            `${v.duration}s`,
            new Date(v.createdAt).toLocaleDateString(),
          ])}
        />
      </Section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase text-stone-400">{label}</p>
      <p className="mt-1 text-lg font-medium text-stone-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-medium text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-stone-500">No records.</p>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-stone-100">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-stone-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
