"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AspectRatio } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createRequestId, pollJobStatus, startRegenerateJob } from "@/lib/generation/client";

export interface GalleryImage {
  id: string;
  poseLabel: string;
  imageUrl: string;
}

interface GenerationGalleryProps {
  images: GalleryImage[];
  aspectRatio?: AspectRatio;
  photoshootId?: string;
  onImageUpdated?: (imageId: string, newUrl: string) => void;
}

const aspectClasses: Record<AspectRatio, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "3:4": "aspect-[3/4]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
};

export function GenerationGallery({
  images,
  aspectRatio = "4:5",
  photoshootId,
  onImageUpdated,
}: GenerationGalleryProps) {
  const router = useRouter();
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = (image: GalleryImage) => {
    const link = document.createElement("a");
    link.href = image.imageUrl;
    link.download = `${image.poseLabel.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
  };

  const handleRegenerate = async (image: GalleryImage) => {
    if (!photoshootId) return;
    setRegeneratingId(image.id);
    setError(null);

    try {
      const { jobId } = await startRegenerateJob(
        photoshootId,
        image.id,
        createRequestId(),
      );

      const { promise } = pollJobStatus(jobId, () => {
        /* progress handled on generation page if user navigates there */
      });

      const final = await promise;
      const completed = final.images.find(
        (img) => img.imageAssetId === image.id && img.status === "completed",
      );

      if (completed?.imageUrl) {
        onImageUpdated?.(image.id, completed.imageUrl);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed.");
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <>
      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => (
          <article
            key={image.id}
            className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => setFullscreenUrl(image.imageUrl)}
              className={cn(
                "relative block w-full overflow-hidden bg-stone-100",
                aspectClasses[aspectRatio],
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.imageUrl}
                alt={image.poseLabel}
                className="h-full w-full object-contain"
              />
            </button>
            <div className="space-y-3 p-4">
              <p className="text-sm font-medium text-stone-900">{image.poseLabel}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownload(image)}>
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setFullscreenUrl(image.imageUrl)}>
                  Fullscreen
                </Button>
                {photoshootId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={regeneratingId === image.id}
                    onClick={() => void handleRegenerate(image)}
                  >
                    Regenerate
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={!!fullscreenUrl}
        onClose={() => setFullscreenUrl(null)}
        title="Preview"
        className="max-w-4xl"
      >
        {fullscreenUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fullscreenUrl}
            alt="Fullscreen preview"
            className="max-h-[70vh] w-full object-contain"
          />
        )}
      </Modal>
    </>
  );
}
