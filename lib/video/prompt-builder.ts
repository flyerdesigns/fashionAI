import type { VideoConfiguration } from "@/types/video";
import { VIDEO_TYPE_OPTIONS } from "./presets";

const CLOTHING_PRESERVATION =
  "Preserve the garment's exact color, material, stitching, logo, print, pattern, fit, and proportions from the source image.";

function labelForVideoType(videoType: VideoConfiguration["videoType"]): string {
  return VIDEO_TYPE_OPTIONS.find((option) => option.id === videoType)?.title ?? videoType;
}

function describeCameraMovement(movement: VideoConfiguration["motion"]["cameraMovement"]): string {
  const map: Record<VideoConfiguration["motion"]["cameraMovement"], string> = {
    static: "static camera",
    slow_zoom_in: "slow zoom in",
    slow_zoom_out: "slow zoom out",
    push_in: "slow push in",
    pull_out: "slow pull out",
    pan_left: "smooth pan left",
    pan_right: "smooth pan right",
    orbit: "cinematic orbit around the subject",
    cinematic_handheld: "subtle cinematic handheld motion",
  };
  return map[movement];
}

function describeMotionToggles(motion: VideoConfiguration["motion"]): string[] {
  const parts: string[] = [];
  if (motion.modelMovement) parts.push("natural model movement");
  if (motion.fabricMovement) parts.push("realistic fabric movement");
  if (motion.naturalBodyMovement) parts.push("subtle body movement");
  if (motion.hairMovement) parts.push("natural hair movement");
  if (motion.backgroundMovement) parts.push("gentle background movement");
  return parts;
}

export function buildVideoPrompt(config: VideoConfiguration): string {
  const motionParts = describeMotionToggles(config.motion);
  const motionText = motionParts.length > 0 ? motionParts.join(", ") + "." : "";

  return [
    `Create a premium ${config.style.replace(/_/g, " ")} fashion video in ${labelForVideoType(config.videoType).toLowerCase()} style.`,
    CLOTHING_PRESERVATION,
    `The model wears the exact uploaded garment. ${motionText}`,
    `Camera: ${describeCameraMovement(config.motion.cameraMovement)} with ${config.motion.motionIntensity} motion intensity.`,
    `Shot on a ${config.camera.lens.replace(/_/g, " ")} lens, ${config.camera.framing.replace(/_/g, " ")} framing.`,
    `${config.lighting.replace(/_/g, " ")} lighting, shallow depth of field, luxury fashion campaign aesthetic.`,
    `Duration: ${config.duration} seconds. Aspect ratio ${config.aspectRatio}. Resolution ${config.resolution}.`,
    config.additionalInstructions?.trim() ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildVideoNegativePrompt(config: VideoConfiguration): string {
  const base = [
    "distorted garment",
    "wrong colors",
    "changed logo",
    "deformed body",
    "blurry face",
    "low quality",
    "watermark",
    "text overlay",
    "cartoon",
    "anime",
  ];
  if (config.negativePrompt?.trim()) {
    base.push(config.negativePrompt.trim());
  }
  return base.join(", ");
}

export function getProgressMessage(status: string, progress: number): string {
  if (status === "queued") return "Queued — waiting for the video worker…";
  if (status === "cancelled") return "Cancelled";
  if (status === "failed") return "Generation failed";
  if (status === "completed") return "Video ready";

  if (progress < 15) return "Preparing source image…";
  if (progress < 35) return "Generating video with AI…";
  if (progress < 75) return "Processing video output…";
  if (progress < 95) return "Uploading to secure storage…";
  return "Finalizing…";
}
