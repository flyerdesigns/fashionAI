export type PhotoshootStatus =
  | "draft"
  | "processing"
  | "completed"
  | "partially_failed"
  | "failed"
  | "cancelled";

export type PhotoshootStep =
  | "upload"
  | "details"
  | "preparation"
  | "model"
  | "pose"
  | "style"
  | "background"
  | "generate";

/** Internal create-flow steps */
export type CreateFlowStep =
  | "entry"
  | "upload"
  | "details"
  | "preparation"
  | "ready"
  | "model"
  | "pose"
  | "style"
  | "background"
  | "generate";

export interface Photoshoot {
  id: string;
  name: string;
  thumbnailUrl: string;
  createdAt: string;
  imageCount: number;
  totalImages?: number;
  status: PhotoshootStatus;
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
}
