"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { GenerationGallery, type GalleryImage } from "@/components/photoshoot/GenerationGallery";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PhotoshootRecord } from "@/lib/photoshoot/repository";
import type { PhotoshootStatus } from "@/types";
import {
  getBackgroundLabel,
  getCameraStyleLabel,
  getLightingLabel,
} from "@/lib/mock/background-presets";
import { getModelPreset } from "@/lib/mock/model-presets";
import { getStyleLabel } from "@/lib/mock/style-presets";
import { formatDate } from "@/lib/utils";
import {
  createRequestId,
  pollJobStatus,
  retryFailedImages,
} from "@/lib/generation/client";

interface PhotoshootDetailClientProps {
  photoshootId: string;
}

const statusBadgeVariant = (
  status: PhotoshootStatus,
): "default" | "success" | "warning" | "muted" => {
  switch (status) {
    case "completed":
      return "success";
    case "processing":
    case "partially_failed":
      return "warning";
    case "cancelled":
    case "draft":
      return "muted";
    default:
      return "default";
  }
};

const statusLabel: Record<PhotoshootStatus, string> = {
  draft: "Draft",
  processing: "Processing",
  completed: "Completed",
  partially_failed: "Partially Failed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function PhotoshootDetailClient({ photoshootId }: PhotoshootDetailClientProps) {
  const router = useRouter();
  const [photoshoot, setPhotoshoot] = useState<PhotoshootRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [retrying, setRetrying] = useState(false);
  const pollStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/photoshoots/${photoshootId}`);
        const data = (await res.json()) as { photoshoot?: PhotoshootRecord; error?: string };
        if (!mounted) return;
        if (data.error || !data.photoshoot) {
          setError(data.error ?? "Photoshoot not found.");
          return;
        }
        setPhotoshoot(data.photoshoot);
        setGalleryImages(
          data.photoshoot.images.map((img) => ({
            id: img.id,
            poseLabel: img.poseLabel,
            imageUrl: img.imageUrl,
          })),
        );
      } catch {
        if (mounted) setError("Unable to load photoshoot.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [photoshootId]);

  const refreshPhotoshoot = useCallback(async () => {
    const res = await fetch(`/api/photoshoots/${photoshootId}`);
    const data = (await res.json()) as { photoshoot?: PhotoshootRecord; error?: string };
    if (data.photoshoot) {
      setPhotoshoot(data.photoshoot);
      setGalleryImages(
        data.photoshoot.images.map((img) => ({
          id: img.id,
          poseLabel: img.poseLabel,
          imageUrl: img.imageUrl,
        })),
      );
    }
  }, [photoshootId]);

  useEffect(() => {
    if (!photoshoot?.generationJobId || photoshoot.status !== "processing") return;

    const jobId = photoshoot.generationJobId;
    const { stop, promise } = pollJobStatus(jobId, () => {
      void refreshPhotoshoot();
    });

    pollStopRef.current = stop;

    promise
      .then(() => void refreshPhotoshoot())
      .catch(() => {
        /* polling timeout — user can refresh */
      });

    return () => {
      stop();
    };
  }, [photoshoot?.generationJobId, photoshoot?.status, refreshPhotoshoot]);

  const handleImageUpdated = (imageId: string, newUrl: string) => {
    setGalleryImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, imageUrl: newUrl } : img)),
    );
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const result = await retryFailedImages(photoshootId, createRequestId());
      router.push(`/generation/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retry failed images.");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <LoadingState message="Loading photoshoot…" className="py-24" />;

  if (error || !photoshoot) {
    return (
      <EmptyState
        title="Photoshoot not found"
        description={error ?? "This photoshoot may have been deleted."}
        action={<Button href="/photoshoots" variant="outline">Back to photoshoots</Button>}
      />
    );
  }

  const modelName = photoshoot.configuration.model
    ? getModelPreset(photoshoot.configuration.model.presetId)?.name ?? "Custom"
    : "Product only";

  const showProcessingBanner = photoshoot.status === "processing";
  const showPartialBanner = photoshoot.status === "partially_failed";
  const showFailedBanner = photoshoot.status === "failed";
  const showCancelledBanner = photoshoot.status === "cancelled";

  return (
    <>
      <PageHeader
        title="Generated Fashion Photos"
        description={`${photoshoot.productName} · ${formatDate(photoshoot.createdAt)}`}
        actions={
          <Badge variant={statusBadgeVariant(photoshoot.status)}>
            {statusLabel[photoshoot.status]}
          </Badge>
        }
      />

      {showProcessingBanner && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Your photoshoot is still being generated.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            {photoshoot.completedImages} of {photoshoot.totalImages} photos ready.
          </p>
          {photoshoot.generationJobId && (
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              href={`/generation/${photoshoot.generationJobId}`}
            >
              View live progress
            </Button>
          )}
        </div>
      )}

      {showPartialBanner && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            {photoshoot.completedImages} of {photoshoot.totalImages} photos generated
          </p>
          <Button
            className="mt-3"
            size="sm"
            loading={retrying}
            onClick={() => void handleRetryFailed()}
          >
            Retry Failed
          </Button>
        </div>
      )}

      {showFailedBanner && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Photoshoot generation failed</p>
          <Button
            className="mt-3"
            size="sm"
            href={`/create?productId=${photoshoot.productId}`}
          >
            Try Again
          </Button>
        </div>
      )}

      {showCancelledBanner && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-medium text-stone-800">Generation cancelled</p>
          <Button
            className="mt-3"
            size="sm"
            href={`/create?productId=${photoshoot.productId}`}
          >
            Generate Again
          </Button>
        </div>
      )}

      {photoshoot.status === "completed" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">Photoshoot complete</p>
        </div>
      )}

      <div className="mb-8 grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem label="Clothing" value={photoshoot.productName} />
        <MetaItem label="Model" value={modelName} />
        <MetaItem
          label="Style"
          value={
            photoshoot.configuration.styleId
              ? getStyleLabel(photoshoot.configuration.styleId)
              : "—"
          }
        />
        <MetaItem
          label="Background"
          value={
            photoshoot.configuration.backgroundId
              ? getBackgroundLabel(photoshoot.configuration.backgroundId)
              : "—"
          }
        />
        <MetaItem
          label="Lighting"
          value={
            photoshoot.configuration.lightingId
              ? getLightingLabel(photoshoot.configuration.lightingId)
              : "—"
          }
        />
        <MetaItem
          label="Camera"
          value={
            photoshoot.configuration.cameraStyleId
              ? getCameraStyleLabel(photoshoot.configuration.cameraStyleId)
              : "—"
          }
        />
        <MetaItem
          label="Images"
          value={`${galleryImages.length}${photoshoot.totalImages ? ` / ${photoshoot.totalImages}` : ""}`}
        />
        <MetaItem label="Provider" value={photoshoot.provider} />
      </div>

      {galleryImages.length === 0 && photoshoot.status !== "processing" ? (
        <EmptyState
          title="No images generated"
          description="This photoshoot has no generated images yet."
          action={
            <Button href={`/create?productId=${photoshoot.productId}`}>
              Create new photoshoot
            </Button>
          }
        />
      ) : (
        <GenerationGallery
          images={galleryImages}
          aspectRatio={photoshoot.configuration.aspectRatio}
          photoshootId={photoshoot.id}
          onImageUpdated={handleImageUpdated}
        />
      )}

      <div className="mt-8 flex gap-3">
        <Button href={`/create?productId=${photoshoot.productId}`}>
          Create Photoshoot
        </Button>
        <Button href="/photoshoots" variant="outline">
          All photoshoots
        </Button>
      </div>
    </>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-stone-900">{value}</p>
    </div>
  );
}
