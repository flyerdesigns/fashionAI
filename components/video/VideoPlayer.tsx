"use client";

import { useRef, useState } from "react";
import type { VideoRecord } from "@/types/video";
import { Button } from "@/components/ui/Button";
import { IconVideo } from "@/components/ui/icons";

interface VideoPlayerProps {
  video: VideoRecord;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!video.videoUrl) {
    return (
      <div className="flex aspect-[9/16] max-h-[70vh] items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
        <IconVideo className="h-10 w-10" />
      </div>
    );
  }

  const togglePlay = () => {
    const element = ref.current;
    if (!element) return;
    if (element.paused) {
      void element.play();
      setPlaying(true);
    } else {
      element.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-black shadow-xl">
      <video
        ref={ref}
        src={video.videoUrl}
        poster={video.thumbnailUrl ?? undefined}
        className="max-h-[70vh] w-full"
        controls
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3 border-t border-stone-800 bg-stone-950 px-4 py-3">
        <Button size="sm" variant="outline" onClick={togglePlay}>
          {playing ? "Pause" : "Play"}
        </Button>
        {video.videoUrl && (
          <Button size="sm" variant="ghost" href={video.videoUrl} download>
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
