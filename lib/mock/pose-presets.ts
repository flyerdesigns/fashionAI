import type { PoseId } from "@/types/photoshoot-config";

export interface PosePreset {
  id: PoseId;
  name: string;
  description: string;
  previewUrl: string;
}

export const POSE_PRESETS: PosePreset[] = [
  { id: "standing", name: "Standing", description: "Classic upright standing pose", previewUrl: "/mock/photoshoot/poses/standing.svg" },
  { id: "walking", name: "Walking", description: "Natural walking motion", previewUrl: "/mock/photoshoot/poses/walking.svg" },
  { id: "sitting", name: "Sitting", description: "Relaxed seated pose", previewUrl: "/mock/photoshoot/poses/sitting.svg" },
  { id: "side-profile", name: "Side Profile", description: "Side-facing profile view", previewUrl: "/mock/photoshoot/poses/side-profile.svg" },
  { id: "back-view", name: "Back View", description: "Rear view of garment", previewUrl: "/mock/photoshoot/poses/back-view.svg" },
  { id: "looking-at-camera", name: "Looking at Camera", description: "Direct eye contact with camera", previewUrl: "/mock/photoshoot/poses/looking-at-camera.svg" },
  { id: "looking-away", name: "Looking Away", description: "Gaze directed off-camera", previewUrl: "/mock/photoshoot/poses/looking-away.svg" },
  { id: "hands-in-pocket", name: "Hands in Pocket", description: "Casual hands-in-pocket stance", previewUrl: "/mock/photoshoot/poses/hands-in-pocket.svg" },
  { id: "full-body", name: "Full Body", description: "Head-to-toe full body framing", previewUrl: "/mock/photoshoot/poses/full-body.svg" },
  { id: "half-body", name: "Half Body", description: "Waist-up half body framing", previewUrl: "/mock/photoshoot/poses/half-body.svg" },
  { id: "close-up", name: "Close Up", description: "Detailed close-up of garment", previewUrl: "/mock/photoshoot/poses/close-up.svg" },
  { id: "dynamic-fashion", name: "Dynamic Fashion Pose", description: "Energetic editorial fashion pose", previewUrl: "/mock/photoshoot/poses/dynamic-fashion.svg" },
];

export function getPosePreset(id: PoseId): PosePreset | undefined {
  return POSE_PRESETS.find((p) => p.id === id);
}

export function getPoseLabel(id: PoseId): string {
  return getPosePreset(id)?.name ?? id;
}
