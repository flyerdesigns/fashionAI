import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { VideoCard } from "@/components/video/VideoCard";
import { requireUser } from "@/lib/auth";
import { videoService } from "@/lib/video/service";

interface VideosPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    sort?: "newest" | "oldest";
  }>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const { items: videos } = await videoService.listVideos(user.id, {
    status: (params.status as "all") ?? "all",
    search: params.search,
    sort: params.sort ?? "newest",
    limit: 24,
  });

  return (
    <>
      <PageHeader
        title="Videos"
        description="Premium AI fashion videos for Reels, TikTok, Shorts, and campaigns."
        actions={
          <Button href="/videos/create" size="lg">
            Create Video
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "processing", "completed", "failed"].map((status) => (
          <Link
            key={status}
            href={status === "all" ? "/videos" : `/videos?status=${status}`}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm capitalize text-stone-600 hover:border-stone-400"
          >
            {status}
          </Link>
        ))}
      </div>

      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-6 py-16 text-center">
          <p className="text-sm text-stone-500">No videos yet. Create your first AI fashion video.</p>
          <Button className="mt-4" href="/videos/create">
            Create Video
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </>
  );
}
