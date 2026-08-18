import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import { videoService } from "@/lib/video/service";

interface VideoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;

  let video;
  try {
    video = await videoService.getVideoForUser(id, user.id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title={video.title}
        description="Premium AI fashion video"
        actions={
          <div className="flex gap-2">
            <Button href="/videos/create" variant="outline">
              Create Another Video
            </Button>
            <Button href="/videos" variant="ghost">
              Back to Library
            </Button>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <VideoPlayer video={video} />

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Badge variant={video.status === "completed" ? "default" : "muted"}>
                {video.status}
              </Badge>
              <span className="text-sm text-stone-500">
                {video.duration}s · {video.aspectRatio} · {video.resolution}
              </span>
            </div>
            <dl className="space-y-3 text-sm">
              <MetaRow label="Video type" value={video.videoType.replace(/_/g, " ")} />
              <MetaRow label="Style" value={video.videoStyle.replace(/_/g, " ")} />
              <MetaRow label="Camera" value={video.cameraMovement.replace(/_/g, " ")} />
              <MetaRow label="Credits used" value={String(video.creditsUsed)} />
              <MetaRow
                label="Created"
                value={new Date(video.createdAt).toLocaleString()}
              />
            </dl>
          </div>

          {video.sourceImageUrl && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="mb-3 text-xs uppercase tracking-widest text-stone-400">Source Image</p>
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-stone-100">
                <Image src={video.sourceImageUrl} alt="Source" fill className="object-cover" />
              </div>
            </div>
          )}

          {video.errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {video.errorMessage}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium capitalize text-stone-900">{value}</dd>
    </div>
  );
}
