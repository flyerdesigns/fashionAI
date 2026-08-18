import Link from "next/link";
import { listAdminVideos } from "@/lib/admin/videos";
import { Badge } from "@/components/ui/Badge";

export default async function AdminVideosPage() {
  const { items } = await listAdminVideos({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Videos</h1>
        <p className="mt-1 text-sm text-stone-500">Monitor all user videos.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">No videos.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Credits</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <Link href={`/admin/videos/${row.id}`} className="hover:underline">
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.userEmail}</td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{row.duration}s</td>
                  <td className="px-4 py-3">{row.creditsUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
