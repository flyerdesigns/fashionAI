"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GenerationJobStatusResponse } from "@/types/generation-job";
import {
  cancelGenerationJob,
  fetchJobStatus,
  getProgressMessage,
  pollJobStatus,
} from "@/lib/generation/client";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  jobId: string;
  photoshootId?: string;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "partially_failed",
  "failed",
  "cancelled",
]);

const aspectClasses = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "3:4": "aspect-[3/4]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
} as const;

export function GenerationProgress({ jobId }: GenerationProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<GenerationJobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const redirected = useRef(false);

  const handleUpdate = useCallback((next: GenerationJobStatusResponse) => {
    setStatus(next);
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchJobStatus(jobId)
      .then((initial) => {
        if (mounted) setStatus(initial);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load generation status.");
        }
      });

    const { promise, stop } = pollJobStatus(jobId, handleUpdate);

    promise
      .then((final) => {
        if (!mounted || redirected.current) return;
        if (TERMINAL_STATUSES.has(final.status)) {
          redirected.current = true;
          router.push(`/photoshoots/${final.photoshootId}`);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Generation failed.");
        }
      });

    return () => {
      mounted = false;
      stop();
    };
  }, [jobId, handleUpdate, router]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelGenerationJob(jobId);
      const updated = await fetchJobStatus(jobId);
      setStatus(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel generation.");
    } finally {
      setCancelling(false);
    }
  };

  if (error && !status) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Button className="mt-4" href="/photoshoots" variant="outline">
          Back to photoshoots
        </Button>
      </div>
    );
  }

  if (!status) {
    return <LoadingState message="Loading generation status…" className="py-24" />;
  }

  const progressMessage = getProgressMessage(status);
  const photosGenerated = status.completedImages;
  const canCancel = status.status === "queued" || status.status === "processing";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50/80 p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          AI Photoshoot
        </p>
        <h2 className="mt-2 font-display text-2xl font-medium text-stone-900">
          Creating your fashion photoshoot
        </h2>
        <p className="mt-2 text-sm text-stone-500">{progressMessage}</p>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="font-medium text-stone-700">
            {photosGenerated} / {status.totalImages} photos generated
          </span>
          <span className="text-stone-400 capitalize">{status.status.replace("_", " ")}</span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-stone-900 transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>

        {(status.status === "queued" || status.status === "processing") && (
          <LoadingState message={progressMessage} className="mt-6 py-2" />
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {canCancel && (
          <div className="mt-6 flex justify-end">
            <Button variant="outline" loading={cancelling} onClick={() => void handleCancel()}>
              Cancel generation
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {status.images.map((image) => (
          <div
            key={image.id}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
          >
            <div className={cn("relative bg-stone-100", aspectClasses["4:5"])}>
              {image.status === "completed" && image.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.imageUrl}
                  alt={image.poseName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                  {image.status === "generating" && (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
                  )}
                  {image.status === "queued" && (
                    <span className="text-xs text-stone-400">Queued</span>
                  )}
                  {image.status === "failed" && (
                    <span className="text-xs text-red-500">Failed</span>
                  )}
                  {image.status === "cancelled" && (
                    <span className="text-xs text-stone-400">Cancelled</span>
                  )}
                </div>
              )}
              {image.status === "completed" && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                  ✓
                </span>
              )}
            </div>
            <p className="truncate px-3 py-2 text-xs font-medium text-stone-700">
              {image.poseName}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
