import Link from "next/link";
import { listAdminPhotoshoots } from "@/lib/admin/photoshoots";
import { Badge } from "@/components/ui/Badge";

export default async function AdminPhotoshootsPage() {
  const { items } = await listAdminPhotoshoots({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Photoshoots</h1>
        <p className="mt-1 text-sm text-stone-500">Monitor all user photoshoots.</p>
      </div>
      <Table items={items} />
    </div>
  );
}

function Table({
  items,
}: {
  items: Awaited<ReturnType<typeof listAdminPhotoshoots>>["items"];
}) {
  if (items.length === 0) return <p className="text-sm text-stone-500">No photoshoots.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            <th className="px-4 py-3 text-left">Product</th>
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Images</th>
            <th className="px-4 py-3 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-t border-stone-100">
              <td className="px-4 py-3">
                <Link href={`/admin/photoshoots/${row.id}`} className="hover:underline">
                  {row.productName}
                </Link>
              </td>
              <td className="px-4 py-3">{row.userEmail}</td>
              <td className="px-4 py-3">
                <Badge variant="muted">{row.status}</Badge>
              </td>
              <td className="px-4 py-3">
                {row.completedImages}/{row.totalImages}
              </td>
              <td className="px-4 py-3 text-xs text-stone-500">
                {new Date(row.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
