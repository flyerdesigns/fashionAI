"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { Photoshoot } from "@/types";
import type { PhotoshootRecord } from "@/lib/photoshoot/repository";

function toPhotoshootCard(record: PhotoshootRecord): Photoshoot {
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

export function PhotoshootLibrary() {
  const [photoshoots, setPhotoshoots] = useState<Photoshoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/photoshoots")
      .then((res) => res.json())
      .then((data: { photoshoots?: PhotoshootRecord[]; error?: string }) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setPhotoshoots((data.photoshoots ?? []).map(toPhotoshootCard));
      })
      .catch(() => setError("Unable to load photoshoots."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading photoshoots…" />;

  if (error) {
    return (
      <EmptyState
        title="Unable to load photoshoots"
        description={error}
        action={<Button onClick={() => window.location.reload()} variant="outline">Try again</Button>}
      />
    );
  }

  if (photoshoots.length === 0) {
    return (
      <EmptyState
        title="No photoshoots yet"
        description="Create your first AI fashion photoshoot to see results here."
        action={<Button href="/create">Create photoshoot</Button>}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {photoshoots.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
