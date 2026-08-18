import type { VideoAspectRatio, VideoDuration, VideoResolution } from "@/types/video";

export interface VideoProviderInput {
  prompt: string;
  negativePrompt?: string;
  sourceImageBuffer: Buffer;
  sourceMimeType: string;
  duration: VideoDuration;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
}

export interface VideoProviderStartResult {
  providerJobId: string;
  done: boolean;
  progress?: number;
  videoBuffer?: Buffer;
  videoMimeType?: string;
  error?: string;
}

export interface VideoProviderStatusResult {
  done: boolean;
  progress?: number;
  videoBuffer?: Buffer;
  videoMimeType?: string;
  error?: string;
}

export interface VideoGenerationProvider {
  readonly id: string;
  readonly model: string;
  generateVideo(input: VideoProviderInput): Promise<VideoProviderStartResult>;
  getGenerationStatus(providerJobId: string): Promise<VideoProviderStatusResult>;
  cancelGeneration(_providerJobId: string): Promise<void>;
}

export interface VideoProviderOperationHandle {
  providerJobId: string;
  operation: unknown;
}
