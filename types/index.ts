export type { User, UserProfile } from "./user";
export type {
  Photoshoot,
  PhotoshootStatus,
  PhotoshootStep,
  UploadedFile,
  CreateFlowStep,
} from "./photoshoot";
export type {
  GenerationJob,
  GenerationImageJob,
  GenerationJobStatus,
  GenerationImageJobStatus,
  GenerationJobType,
  GenerationErrorCategory,
  CreateGenerationJobResponse,
  GenerationJobStatusResponse,
} from "./generation-job";
export type {
  Product,
  ProductType,
  ProductCategory,
  Gender,
  PresetColor,
  ClothingAsset,
  ClothingAssetStatus,
  AIClothingReference,
  CreateClothingAssetInput,
  UpdateClothingAssetInput,
} from "./clothing";
export type { DashboardStats, QuickCreateOption } from "./dashboard";
export type {
  ModelGender,
  AgeRange,
  SkinTone,
  HairColor,
  HairStyle,
  BodyType,
  ModelPresetId,
  PoseId,
  StyleCategory,
  StyleId,
  BackgroundId,
  LightingId,
  CameraStyleId,
  FramingId,
  AspectRatio,
  ModelAppearance,
  ModelConfiguration,
  PhotoshootConfiguration,
  CompletePhotoshootConfiguration,
} from "./photoshoot-config";
export {
  MAX_POSES,
  MAX_CUSTOM_PROMPT_LENGTH,
  DEFAULT_PHOTOSHOOT_CONFIG,
} from "./photoshoot-config";

export {
  clothingAssetToProduct,
  toAIClothingReference,
} from "./clothing";
