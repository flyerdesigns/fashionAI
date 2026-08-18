import type {
  VideoGenerationJobRecord,
  VideoJobStatus,
  VideoListFilters,
  VideoRecord,
  VideoStatus,
} from "@/types/video";

export interface VideoRepository {
  createVideo(data: Omit<VideoRecord, "id" | "createdAt" | "updatedAt" | "videoUrl" | "thumbnailUrl" | "sourceImageUrl">, options?: { id?: string }): Promise<VideoRecord>;
  updateVideo(id: string, data: Partial<VideoRecord>): Promise<VideoRecord | null>;
  findVideoById(id: string): Promise<VideoRecord | null>;
  findVideoByIdForUser(id: string, userId: string): Promise<VideoRecord | null>;
  listVideosForUser(userId: string, filters?: VideoListFilters): Promise<{ items: VideoRecord[]; total: number }>;
  deleteVideo(id: string, userId: string): Promise<boolean>;
  findVideoByStorageKey(storageKey: string): Promise<VideoRecord | null>;

  createJob(data: Omit<VideoGenerationJobRecord, "id" | "createdAt" | "updatedAt">, options?: { id?: string }): Promise<VideoGenerationJobRecord>;
  updateJob(id: string, data: Partial<VideoGenerationJobRecord>): Promise<VideoGenerationJobRecord | null>;
  findJobById(id: string): Promise<VideoGenerationJobRecord | null>;
  findJobByIdForUser(id: string, userId: string): Promise<VideoGenerationJobRecord | null>;
  findActiveJobByRequestId(requestId: string): Promise<(VideoGenerationJobRecord & { videoId: string }) | null>;
  claimNextJob(workerId: string): Promise<VideoGenerationJobRecord | null>;
  countVideosForUser(userId: string): Promise<number>;
}

export const ACTIVE_VIDEO_JOB_STATUSES: VideoJobStatus[] = ["queued", "processing"];

export function isTerminalVideoJobStatus(status: VideoJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function isTerminalVideoStatus(status: VideoStatus): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "partially_failed" ||
    status === "cancelled"
  );
}
