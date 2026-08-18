import Link from "next/link";
import Image from "next/image";
import type { VideoRecord } from "@/types/video";
import { Badge } from "@/components/ui/Badge";
import { IconVideo } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: VideoRecord;
}

export function VideoCard({ video }: VideoCardProps) {
  const previewUrl = video.thumbnailUrl ?? video.sourceImageUrl;
  const href = `/videos/${video.id}`;

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[9/16] bg-stone-100">
        {previewUrl ? (
          <Image src={previewUrl} alt={video.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <IconVideo className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
          <div className="rounded-full bg-white/90 p-3 opacity-0 transition group-hover:opacity-100">
            <IconVideo className="h-5 w-5 text-stone-900" />
          </div>
        </div>
        <div className="absolute left-3 top-3">
          <Badge variant={video.status === "completed" ? "default" : "muted"}>{video.status}</Badge>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-medium text-stone-900">{video.title}</h3>
        <p className={cn("text-xs text-stone-500")}>
          {video.duration}s · {video.aspectRatio} ·{" "}
          {new Date(video.createdAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
