export type VideoStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "partially_failed"
  | "failed"
  | "cancelled";

export type VideoJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type VideoAspectRatio = "9:16" | "4:5" | "1:1" | "16:9";

export type VideoDuration = 5 | 10 | 15;

export type VideoResolution = "720p" | "1080p";

export type CameraMovement =
  | "static"
  | "slow_zoom_in"
  | "slow_zoom_out"
  | "push_in"
  | "pull_out"
  | "pan_left"
  | "pan_right"
  | "orbit"
  | "cinematic_handheld";

export type MotionIntensity = "subtle" | "medium" | "dynamic";

export type VideoStyle =
  | "luxury_fashion"
  | "cinematic"
  | "editorial"
  | "commercial"
  | "studio"
  | "streetwear"
  | "minimal"
  | "dramatic";

export type VideoType =
  | "fashion_reel"
  | "product_showcase"
  | "model_walk"
  | "model_pose"
  | "product_closeup"
  | "cinematic_campaign"
  | "social_media_ad";

export type VideoSourceType = "product" | "photoshoot" | "generated_image" | "upload";

export type VideoLighting =
  | "softbox"
  | "natural"
  | "golden_hour"
  | "studio"
  | "dramatic"
  | "high_key"
  | "low_key";

export type VideoLens = "24mm" | "35mm" | "50mm" | "85mm" | "100mm_macro";

export type VideoFraming = "full_body" | "medium" | "close_up" | "product_detail";

export type VideoErrorCategory =
  | "configuration_error"
  | "authentication_error"
  | "rate_limit"
  | "timeout"
  | "invalid_request"
  | "provider_error"
  | "storage_error"
  | "insufficient_credits"
  | "cancelled"
  | "unknown_error";

export interface VideoMotionConfig {
  cameraMovement: CameraMovement;
  motionIntensity: MotionIntensity;
  modelMovement: boolean;
  fabricMovement: boolean;
  naturalBodyMovement: boolean;
  hairMovement: boolean;
  backgroundMovement: boolean;
}

export interface VideoCameraConfig {
  lens: VideoLens;
  framing: VideoFraming;
}

export interface VideoConfiguration {
  videoType: VideoType;
  motion: VideoMotionConfig;
  style: VideoStyle;
  lighting: VideoLighting;
  camera: VideoCameraConfig;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  duration: VideoDuration;
  additionalInstructions?: string;
  negativePrompt?: string;
}

export interface VideoRecord {
  id: string;
  userId: string;
  productId: string | null;
  photoshootId: string | null;
  sourceImageId: string | null;
  sourceType: VideoSourceType;
  sourceStorageKey: string | null;
  sourceImageUrl: string | null;
  title: string;
  status: VideoStatus;
  videoType: VideoType;
  provider: string;
  providerJobId: string | null;
  prompt: string;
  negativePrompt: string | null;
  duration: VideoDuration;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  motionPreset: string | null;
  cameraMovement: CameraMovement;
  videoStyle: VideoStyle;
  configuration: VideoConfiguration;
  storageKey: string | null;
  videoUrl: string | null;
  thumbnailStorageKey: string | null;
  thumbnailUrl: string | null;
  creditsUsed: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface VideoGenerationJobRecord {
  id: string;
  userId: string;
  videoId: string;
  status: VideoJobStatus;
  provider: string;
  providerJobId: string | null;
  progress: number;
  requestId: string | null;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateVideoJobResponse {
  jobId: string;
  videoId: string;
  status: VideoJobStatus;
  estimatedCredits: number;
}

export interface VideoJobStatusResponse {
  jobId: string;
  videoId: string;
  status: VideoJobStatus;
  progress: number;
  progressMessage: string;
  video: VideoRecord | null;
  error: string | null;
  errorCategory: VideoErrorCategory | null;
}

export interface VideoListFilters {
  status?: VideoStatus | "all";
  search?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}
