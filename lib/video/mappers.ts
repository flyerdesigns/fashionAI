import type { Video as PrismaVideo, VideoGenerationJob as PrismaVideoJob } from "@/lib/generated/prisma";
import { buildAssetUrl } from "@/lib/storage/keys";
import type {
  VideoConfiguration,
  VideoGenerationJobRecord,
  VideoRecord,
  VideoAspectRatio,
  VideoDuration,
  VideoResolution,
  VideoSourceType,
  VideoStatus,
  VideoJobStatus,
  CameraMovement,
  VideoStyle,
  VideoType,
} from "@/types/video";

export function mapVideo(record: PrismaVideo): VideoRecord {
  return {
    id: record.id,
    userId: record.userId,
    productId: record.productId,
    photoshootId: record.photoshootId,
    sourceImageId: record.sourceImageId,
    sourceType: record.sourceType as VideoSourceType,
    sourceStorageKey: record.sourceStorageKey,
    sourceImageUrl: record.sourceStorageKey ? buildAssetUrl(record.sourceStorageKey) : null,
    title: record.title,
    status: record.status as VideoStatus,
    videoType: record.videoType as VideoType,
    provider: record.provider,
    providerJobId: record.providerJobId,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt,
    duration: record.duration as VideoDuration,
    aspectRatio: record.aspectRatio as VideoAspectRatio,
    resolution: record.resolution as VideoResolution,
    motionPreset: record.motionPreset,
    cameraMovement: record.cameraMovement as CameraMovement,
    videoStyle: record.videoStyle as VideoStyle,
    configuration: record.configuration as unknown as VideoConfiguration,
    storageKey: record.storageKey,
    videoUrl: record.storageKey ? buildAssetUrl(record.storageKey) : null,
    thumbnailStorageKey: record.thumbnailStorageKey,
    thumbnailUrl: record.thumbnailStorageKey ? buildAssetUrl(record.thumbnailStorageKey) : null,
    creditsUsed: record.creditsUsed,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
  };
}

export function mapVideoJob(record: PrismaVideoJob): VideoGenerationJobRecord {
  return {
    id: record.id,
    userId: record.userId,
    videoId: record.videoId,
    status: record.status as VideoJobStatus,
    provider: record.provider,
    providerJobId: record.providerJobId,
    progress: record.progress,
    requestId: record.requestId,
    attempts: record.attempts,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
  };
}
