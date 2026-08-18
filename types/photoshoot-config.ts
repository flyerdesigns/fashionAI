import type { AIClothingReference } from "./clothing";

export type ModelGender = "female" | "male" | "non-binary" | "product-only";
export type AgeRange = "young-adult" | "adult" | "mature";
export type SkinTone = "fair" | "light" | "medium" | "tan" | "deep";
export type HairColor = "black" | "brown" | "blonde" | "red" | "custom";
export type HairStyle = "short" | "long" | "straight" | "wavy" | "curly" | "tied";
export type BodyType = "slim" | "athletic" | "average" | "curvy" | "plus-size";

export type ModelPresetId =
  | "indian-fashion"
  | "luxury-editorial"
  | "casual-fashion"
  | "ecommerce"
  | "custom";

export type PoseId =
  | "standing"
  | "walking"
  | "sitting"
  | "side-profile"
  | "back-view"
  | "looking-at-camera"
  | "looking-away"
  | "hands-in-pocket"
  | "full-body"
  | "half-body"
  | "close-up"
  | "dynamic-fashion";

export type StyleCategory = "studio" | "lifestyle" | "luxury" | "indian-ethnic";

export type StyleId =
  | "clean-white-studio"
  | "dark-luxury-studio"
  | "minimal-studio"
  | "fashion-editorial"
  | "cafe"
  | "street"
  | "home"
  | "office"
  | "beach"
  | "hotel"
  | "luxury-hotel"
  | "designer-campaign"
  | "high-fashion-editorial"
  | "runway-inspired"
  | "royal-palace"
  | "wedding"
  | "festive"
  | "diwali"
  | "traditional-indian";

export type BackgroundId =
  | "white-studio"
  | "black-studio"
  | "beige-studio"
  | "luxury-hotel"
  | "modern-apartment"
  | "street"
  | "beach"
  | "garden"
  | "palace"
  | "runway"
  | "custom";

export type LightingId =
  | "soft-studio"
  | "natural-light"
  | "golden-hour"
  | "dramatic"
  | "high-key"
  | "low-key"
  | "cinematic"
  | "fashion-editorial";

export type CameraStyleId =
  | "ecommerce"
  | "fashion-editorial"
  | "luxury-campaign"
  | "lifestyle"
  | "cinematic"
  | "instagram"
  | "social-media";

export type FramingId = "full-body" | "three-quarter" | "waist-up" | "close-up";

export type AspectRatio = "1:1" | "4:5" | "3:4" | "9:16" | "16:9";

export interface ModelAppearance {
  skinTone: SkinTone;
  hairColor: HairColor;
  customHairColor?: string;
  hairStyle: HairStyle;
  bodyType: BodyType;
}

export interface ModelConfiguration {
  presetId: ModelPresetId;
  gender: ModelGender;
  ageRange: AgeRange;
  appearance: ModelAppearance;
}

export interface PhotoshootConfiguration {
  model: ModelConfiguration | null;
  poses: PoseId[];
  styleId: StyleId | null;
  backgroundId: BackgroundId | null;
  customBackground?: string;
  lightingId: LightingId | null;
  cameraStyleId: CameraStyleId | null;
  framing: FramingId;
  aspectRatio: AspectRatio;
  customPrompt?: string;
}

export interface CompletePhotoshootConfiguration {
  clothing: AIClothingReference;
  config: PhotoshootConfiguration;
}

export const MAX_POSES = 6;
export const MAX_CUSTOM_PROMPT_LENGTH = 500;

export const DEFAULT_PHOTOSHOOT_CONFIG: PhotoshootConfiguration = {
  model: null,
  poses: [],
  styleId: null,
  backgroundId: null,
  customBackground: "",
  lightingId: null,
  cameraStyleId: null,
  framing: "full-body",
  aspectRatio: "4:5",
  customPrompt: "",
};
