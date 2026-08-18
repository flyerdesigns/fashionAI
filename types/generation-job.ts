import type { PoseId } from "./photoshoot-config";

export type GenerationJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partially_failed"
  | "failed"
  | "cancelled";

export type GenerationImageJobStatus =
  | "queued"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled";

export type GenerationJobType = "photoshoot" | "regenerate" | "retry_failed";

export type GenerationErrorCategory =
  | "configuration_error"
  | "authentication_error"
  | "rate_limit"
  | "timeout"
  | "invalid_request"
  | "provider_error"
  | "storage_error"
  | "unknown_error";

export interface GenerationImageJob {
  id: string;
  jobId: string;
  poseId: PoseId;
  poseName: string;
  index: number;
  status: GenerationImageJobStatus;
  imageUrl: string | null;
  storageKey: string | null;
  /** Links to the photoshoot gallery image id */
  imageAssetId: string | null;
  error: string | null;
  errorCategory: GenerationErrorCategory | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface GenerationJob {
  id: string;
  userId: string;
  photoshootId: string;
  productId: string;
  provider: string;
  type: GenerationJobType;
  status: GenerationJobStatus;
  requestId: string | null;
  totalImages: number;
  completedImages: number;
  failedImages: number;
  currentImage: number | null;
  progress: number;
  error: string | null;
  errorCategory: GenerationErrorCategory | null;
  /** Set for single-image regenerate jobs */
  targetImageId: string | null;
  images: GenerationImageJob[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface CreateGenerationJobResponse {
  jobId: string;
  photoshootId: string;
  status: GenerationJobStatus;
}

export interface GenerationJobStatusResponse {
  jobId: string;
  photoshootId: string;
  status: GenerationJobStatus;
  type: GenerationJobType;
  totalImages: number;
  completedImages: number;
  failedImages: number;
  progress: number;
  currentImage: number | null;
  images: GenerationImageJob[];
  error: string | null;
}
