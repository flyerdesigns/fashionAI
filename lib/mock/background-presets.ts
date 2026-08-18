import type {
  AspectRatio,
  BackgroundId,
  CameraStyleId,
  FramingId,
  LightingId,
} from "@/types/photoshoot-config";

export interface BackgroundPreset {
  id: BackgroundId;
  name: string;
  description: string;
  previewUrl: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "white-studio", name: "White Studio", description: "Clean white studio backdrop", previewUrl: "/mock/photoshoot/backgrounds/white-studio.svg" },
  { id: "black-studio", name: "Black Studio", description: "Dramatic black studio backdrop", previewUrl: "/mock/photoshoot/backgrounds/black-studio.svg" },
  { id: "beige-studio", name: "Beige Studio", description: "Warm beige studio tone", previewUrl: "/mock/photoshoot/backgrounds/beige-studio.svg" },
  { id: "luxury-hotel", name: "Luxury Hotel", description: "Elegant hotel interior", previewUrl: "/mock/photoshoot/backgrounds/luxury-hotel.svg" },
  { id: "modern-apartment", name: "Modern Apartment", description: "Contemporary apartment setting", previewUrl: "/mock/photoshoot/backgrounds/modern-apartment.svg" },
  { id: "street", name: "Street", description: "Urban street environment", previewUrl: "/mock/photoshoot/backgrounds/street.svg" },
  { id: "beach", name: "Beach", description: "Coastal beach location", previewUrl: "/mock/photoshoot/backgrounds/beach.svg" },
  { id: "garden", name: "Garden", description: "Lush garden setting", previewUrl: "/mock/photoshoot/backgrounds/garden.svg" },
  { id: "palace", name: "Palace", description: "Grand palace architecture", previewUrl: "/mock/photoshoot/backgrounds/palace.svg" },
  { id: "runway", name: "Runway", description: "Fashion runway setting", previewUrl: "/mock/photoshoot/backgrounds/runway.svg" },
  { id: "custom", name: "Custom Background", description: "Describe your own background", previewUrl: "/mock/photoshoot/backgrounds/custom.svg" },
];

export const LIGHTING_PRESETS: { id: LightingId; name: string; description: string }[] = [
  { id: "soft-studio", name: "Soft Studio", description: "Even soft studio lighting" },
  { id: "natural-light", name: "Natural Light", description: "Soft natural daylight" },
  { id: "golden-hour", name: "Golden Hour", description: "Warm golden hour glow" },
  { id: "dramatic", name: "Dramatic", description: "High contrast dramatic lighting" },
  { id: "high-key", name: "High Key", description: "Bright high-key illumination" },
  { id: "low-key", name: "Low Key", description: "Moody low-key shadows" },
  { id: "cinematic", name: "Cinematic", description: "Film-inspired cinematic lighting" },
  { id: "fashion-editorial", name: "Fashion Editorial", description: "Professional editorial lighting" },
];

export const CAMERA_STYLE_PRESETS: { id: CameraStyleId; name: string; description: string }[] = [
  { id: "ecommerce", name: "E-commerce", description: "Clean catalog product photography" },
  { id: "fashion-editorial", name: "Fashion Editorial", description: "High-fashion editorial look" },
  { id: "luxury-campaign", name: "Luxury Campaign", description: "Premium luxury campaign style" },
  { id: "lifestyle", name: "Lifestyle", description: "Natural lifestyle photography" },
  { id: "cinematic", name: "Cinematic", description: "Cinematic film-like quality" },
  { id: "instagram", name: "Instagram", description: "Instagram-ready fashion content" },
  { id: "social-media", name: "Social Media", description: "Optimized for social platforms" },
];

export const FRAMING_OPTIONS: { id: FramingId; label: string }[] = [
  { id: "full-body", label: "Full Body" },
  { id: "three-quarter", label: "3/4" },
  { id: "waist-up", label: "Waist Up" },
  { id: "close-up", label: "Close Up" },
];

export const ASPECT_RATIO_OPTIONS: { id: AspectRatio; label: string; description: string }[] = [
  { id: "1:1", label: "1:1", description: "Square" },
  { id: "4:5", label: "4:5", description: "Instagram portrait" },
  { id: "3:4", label: "3:4", description: "Portrait" },
  { id: "9:16", label: "9:16", description: "Stories / Reels" },
  { id: "16:9", label: "16:9", description: "Landscape" },
];

export function getBackgroundPreset(id: BackgroundId): BackgroundPreset | undefined {
  return BACKGROUND_PRESETS.find((b) => b.id === id);
}

export function getBackgroundLabel(id: BackgroundId): string {
  return getBackgroundPreset(id)?.name ?? id;
}

export function getLightingLabel(id: LightingId): string {
  return LIGHTING_PRESETS.find((l) => l.id === id)?.name ?? id;
}

export function getCameraStyleLabel(id: CameraStyleId): string {
  return CAMERA_STYLE_PRESETS.find((c) => c.id === id)?.name ?? id;
}

export function getFramingLabel(id: FramingId): string {
  return FRAMING_OPTIONS.find((f) => f.id === id)?.label ?? id;
}

export function getAspectRatioLabel(id: AspectRatio): string {
  return ASPECT_RATIO_OPTIONS.find((a) => a.id === id)?.label ?? id;
}
