import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Photoshoot, PhotoshootStatus } from "@/types";
import { IconExternalLink } from "@/components/ui/icons";

const statusConfig: Record<
  PhotoshootStatus,
  { label: string; variant: "default" | "success" | "warning" | "muted" }
> = {
  draft: { label: "Draft", variant: "muted" },
  processing: { label: "Processing", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  partially_failed: { label: "Partially Failed", variant: "warning" },
  failed: { label: "Failed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

interface ProjectCardProps {
  project: Photoshoot;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const status = statusConfig[project.status];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:border-stone-300 hover:shadow-md sm:flex-row">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-stone-100 sm:aspect-auto sm:h-auto sm:w-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.thumbnailUrl}
          alt={project.name}
          className="h-full w-full object-cover sm:h-full sm:min-h-[108px]"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-medium text-stone-900">
              {project.name}
            </h3>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="mt-1.5 text-sm text-stone-500">
            {formatDate(project.createdAt)} ·{" "}
            {project.totalImages && project.status === "processing"
              ? `${project.imageCount} / ${project.totalImages} images`
              : `${project.imageCount} images`}
          </p>
        </div>
        <Button
          href={`/photoshoots/${project.id}`}
          variant="outline"
          size="sm"
          className="w-fit"
        >
          Open
          <IconExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}
