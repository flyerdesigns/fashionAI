import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminPhotoshootDetail } from "@/lib/admin/photoshoots";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPhotoshootDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminPhotoshootDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/photoshoots" className="text-sm text-stone-500 hover:text-stone-800">
        ← Back to photoshoots
      </Link>
      <h1 className="font-display text-2xl font-medium text-stone-900">
        {detail.productNameSnapshot}
      </h1>
      <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-stone-200 bg-white p-5 text-sm">
        <p>User: {detail.user.email}</p>
        <p>Status: {detail.status}</p>
        <p>Provider: {detail.provider}</p>
        <p>Images: {detail.completedImages}/{detail.totalImages}</p>
        <p>Jobs: {detail.generationJobs.length}</p>
      </div>
    </div>
  );
}
