import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { QuickCreateCard } from "@/components/dashboard/QuickCreateCard";
import { VideoCard } from "@/components/video/VideoCard";
import { IconPlus } from "@/components/ui/icons";
import { mockQuickCreateOptions } from "@/lib/mock/dashboard";
import { getGreeting } from "@/lib/mock/user";
import { requireUser } from "@/lib/auth";
import { photoshootService } from "@/lib/photoshoot/service";
import { videoService } from "@/lib/video/service";
import type { Photoshoot } from "@/types";

function toPhotoshootCard(record: Awaited<ReturnType<typeof photoshootService.listPhotoshoots>>[0]): Photoshoot {
  return {
    id: record.id,
    name: record.productName,
    thumbnailUrl: record.images[0]?.imageUrl ?? record.clothingThumbnailUrl,
    createdAt: record.createdAt,
    imageCount: record.images.length,
    totalImages: record.totalImages,
    status: record.status,
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const greeting = getGreeting();
  const stats = await photoshootService.getDashboardStats(user.id);
  const recentPhotoshoots = (await photoshootService.listPhotoshoots(user.id))
    .slice(0, 4)
    .map(toPhotoshootCard);
  const recentVideos = await videoService.listRecentVideos(user.id, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-stone-400">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-stone-900 sm:text-4xl">
            {greeting}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-base text-stone-500">
            Create premium fashion content with AI.
          </p>
        </div>
        <Button href="/create" size="lg" className="shrink-0">
          <IconPlus className="h-4 w-4" />
          Create New Photoshoot
        </Button>
        <Button href="/videos/create" size="lg" variant="outline" className="shrink-0">
          Create AI Video
        </Button>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-medium uppercase tracking-widest text-stone-400">
            Overview
          </h2>
          <Badge variant="muted">Your data</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Photos" value={stats.totalPhotos} />
          <StatCard label="Total Videos" value={stats.totalVideos} />
          <StatCard label="Products" value={stats.products} />
          <StatCard label="Photoshoots" value={stats.photoshoots} />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-medium text-stone-900">
            Recent Photoshoots
          </h2>
          <Button href="/photoshoots" variant="ghost" size="sm">
            View all
          </Button>
        </div>
        {recentPhotoshoots.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12 text-center text-sm text-stone-500">
            No photoshoots yet. Create your first AI fashion photoshoot.
          </p>
        ) : (
          <div className="grid gap-4">
            {recentPhotoshoots.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-medium text-stone-900">Recent Videos</h2>
          <Button href="/videos" variant="ghost" size="sm">
            View all
          </Button>
        </div>
        {recentVideos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12 text-center text-sm text-stone-500">
            No videos yet. Create your first AI fashion video.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-medium text-stone-900">
          Quick Create
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockQuickCreateOptions.map((option) => (
            <QuickCreateCard key={option.id} option={option} />
          ))}
        </div>
      </section>
    </div>
  );
}
