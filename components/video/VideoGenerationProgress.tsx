"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { VideoJobStatusResponse } from "@/types/video";
import {
  cancelVideoJob,
  fetchVideoJobStatus,
  pollVideoJobStatus,
} from "@/lib/video/client";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";

interface VideoGenerationProgressProps {
  jobId: string;
}

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export function VideoGenerationProgress({ jobId }: VideoGenerationProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<VideoJobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const redirected = useRef(false);

  const handleUpdate = useCallback((next: VideoJobStatusResponse) => {
    setStatus(next);
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchVideoJobStatus(jobId)
      .then((initial) => {
        if (mounted) setStatus(initial);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load video status.");
        }
      });

    const { promise, stop } = pollVideoJobStatus(jobId, handleUpdate);

    promise
      .then((final) => {
        if (!mounted || redirected.current) return;
        if (TERMINAL.has(final.status) && final.status === "completed") {
          redirected.current = true;
          router.push(`/videos/${final.videoId}`);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Video generation failed.");
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
      const updated = await cancelVideoJob(jobId);
      setStatus(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel video generation.");
    } finally {
      setCancelling(false);
    }
  };

  if (error && !status) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Button className="mt-4" href="/videos" variant="outline">
          Back to videos
        </Button>
      </div>
    );
  }

  if (!status) {
    return <LoadingState message="Loading video generation status…" className="py-24" />;
  }

  const video = status.video;
  const canCancel = status.status === "queued" || status.status === "processing";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {video?.sourceImageUrl && (
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100">
            <Image src={video.sourceImageUrl} alt="Source" fill className="object-cover" />
          </div>
        )}
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-400">Status</p>
            <h2 className="mt-1 font-display text-2xl capitalize text-stone-900">
              {status.progressMessage}
            </h2>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-stone-500">
              <span>Progress</span>
              <span>{status.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  status.status === "failed" ? "bg-red-500" : "bg-stone-900",
                )}
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
          {video && (
            <dl className="grid gap-2 text-sm text-stone-600">
              <div className="flex justify-between">
                <dt>Video type</dt>
                <dd className="capitalize">{video.videoType.replace(/_/g, " ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Format</dt>
                <dd>
                  {video.aspectRatio} · {video.resolution} · {video.duration}s
                </dd>
              </div>
            </dl>
          )}
          {status.error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{status.error}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {canCancel && (
              <Button variant="outline" loading={cancelling} onClick={() => void handleCancel()}>
                Cancel
              </Button>
            )}
            {status.status === "completed" && (
              <Button href={`/videos/${status.videoId}`}>View Video</Button>
            )}
            {status.status === "failed" && (
              <Button href="/videos/create" variant="outline">
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
