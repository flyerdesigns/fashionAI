import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminVideoDetail } from "@/lib/admin/videos";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVideoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminVideoDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/videos" className="text-sm text-stone-500 hover:text-stone-800">
        ← Back to videos
      </Link>
      <h1 className="font-display text-2xl font-medium text-stone-900">{detail.title}</h1>
      <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-stone-200 bg-white p-5 text-sm">
        <p>User: {detail.user.email}</p>
        <p>Status: {detail.status}</p>
        <p>Provider: {detail.provider}</p>
        <p>Duration: {detail.duration}s</p>
        <p>Credits used: {detail.creditsUsed}</p>
        {detail.videoUrl && (
          <p>
            Video:{" "}
            <a href={detail.videoUrl} className="text-stone-700 underline">
              Authenticated asset URL
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
