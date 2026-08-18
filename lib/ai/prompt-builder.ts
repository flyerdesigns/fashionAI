import type { AIClothingReference } from "@/types/clothing";
import type {
  CompletePhotoshootConfiguration,
  PhotoshootConfiguration,
  PoseId,
} from "@/types/photoshoot-config";
import { getColorLabel, getProductTypeLabel } from "@/lib/mock/constants";
import {
  getModelPreset,
  getModelGenderLabel,
  getAgeRangeLabel,
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_STYLES,
  BODY_TYPES,
} from "@/lib/mock/model-presets";
import { getPoseLabel } from "@/lib/mock/pose-presets";
import { getStyleLabel } from "@/lib/mock/style-presets";
import {
  getBackgroundLabel,
  getLightingLabel,
  getCameraStyleLabel,
  getFramingLabel,
  getAspectRatioLabel,
} from "@/lib/mock/background-presets";

export interface StructuredPrompt {
  systemInstructions: string;
  clothing: ClothingPromptSection;
  model: ModelPromptSection | null;
  productOnlyInstructions: string[] | null;
  pose: string;
  style: string;
  background: string;
  lighting: string;
  camera: CameraPromptSection;
  qualityRequirements: string[];
  preservationRules: string[];
  customInstructions: string;
  fullPrompt: string;
}

export interface ClothingPromptSection {
  productName: string;
  productType: string;
  color: string;
  gender: string;
  description: string;
  brandName: string;
}

export interface ModelPromptSection {
  presetName: string;
  gender: string;
  ageRange: string;
  skinTone: string;
  hair: string;
  hairStyle: string;
  bodyType: string;
}

export interface CameraPromptSection {
  style: string;
  framing: string;
  aspectRatio: string;
}

const CLOTHING_PRESERVATION_RULES = [
  "The attached reference image is the PRIMARY commercial product. Use THIS EXACT GARMENT.",
  "Preserve garment type, color, pattern, print, embroidery, logos, neckline, sleeves, buttons, texture, and fabric appearance.",
  "Do not alter garment design, do not change garment color, do not change print, do not remove embroidery.",
  "Do not add patterns, do not replace the garment, do not create a similar garment, do not distort logos.",
  "Do not invent garment details, do not change sleeve length, neckline, or garment structure.",
  "The product must remain commercially recognizable exactly as uploaded.",
  "Make the clothing realistically fit the scene with natural draping, realistic fabric folds, and realistic stitching.",
  "Do not add accessories that cover important garment details.",
];

const QUALITY_REQUIREMENTS = [
  "Photorealistic professional commercial fashion photography.",
  "High-end commercial photography quality with premium composition.",
  "Realistic fabric, realistic folds, realistic stitching.",
  "Natural anatomy, realistic hands, realistic face when a model is present.",
  "Realistic shadows and natural lighting integration.",
];

const PRODUCT_ONLY_INSTRUCTIONS = [
  "This is a product-only fashion photoshoot with NO human model.",
  "Show the exact uploaded garment in a premium environment.",
  "Acceptable presentations: garment on mannequin, luxury flat-lay, garment hanging in studio, or premium product display.",
  "Do not include a human model, face, or body.",
  "Keep the garment as the sole hero subject.",
];

const SYSTEM_INSTRUCTIONS = [
  "Generate professional fashion photography for a clothing brand.",
  "The attached clothing image is the authoritative product reference.",
  "Create a professional fashion photoshoot USING THIS EXACT GARMENT — not a similar garment.",
  "The garment must be the visual focus and remain commercially accurate.",
].join(" ");

function buildClothingSection(clothing: AIClothingReference): ClothingPromptSection {
  return {
    productName: clothing.productName,
    productType: getProductTypeLabel(clothing.productType),
    color: getColorLabel(clothing.color, clothing.customColor),
    gender: clothing.gender,
    description: clothing.description ?? "",
    brandName: clothing.brandName ?? "",
  };
}

function buildModelSection(config: PhotoshootConfiguration): ModelPromptSection | null {
  if (!config.model || config.model.gender === "product-only") return null;

  const preset = getModelPreset(config.model.presetId);
  const { appearance, gender, ageRange } = config.model;

  const hairLabel =
    appearance.hairColor === "custom" && appearance.customHairColor
      ? appearance.customHairColor
      : HAIR_COLORS.find((h) => h.value === appearance.hairColor)?.label ?? appearance.hairColor;

  return {
    presetName: preset?.name ?? config.model.presetId,
    gender: getModelGenderLabel(gender),
    ageRange: getAgeRangeLabel(ageRange),
    skinTone: SKIN_TONES.find((s) => s.value === appearance.skinTone)?.label ?? appearance.skinTone,
    hair: hairLabel,
    hairStyle: HAIR_STYLES.find((h) => h.value === appearance.hairStyle)?.label ?? appearance.hairStyle,
    bodyType: BODY_TYPES.find((b) => b.value === appearance.bodyType)?.label ?? appearance.bodyType,
  };
}

function buildBackgroundDescription(config: PhotoshootConfiguration): string {
  if (config.backgroundId === "custom" && config.customBackground?.trim()) {
    return config.customBackground.trim();
  }
  if (config.backgroundId) {
    return getBackgroundLabel(config.backgroundId);
  }
  return "";
}

function assemblePrompt(sections: Omit<StructuredPrompt, "fullPrompt">): string {
  const lines: string[] = [sections.systemInstructions, ""];

  lines.push("=== CLOTHING (PRIMARY PRODUCT REFERENCE) ===");
  lines.push(`Product: ${sections.clothing.productName}`);
  lines.push(`Type: ${sections.clothing.productType}`);
  lines.push(`Color: ${sections.clothing.color}`);
  if (sections.clothing.description) lines.push(`Description: ${sections.clothing.description}`);
  if (sections.clothing.brandName) lines.push(`Brand: ${sections.clothing.brandName}`);
  lines.push("", "The attached image shows the exact garment to preserve.");

  lines.push("", "Preservation requirements:");
  sections.preservationRules.forEach((r) => lines.push(`- ${r}`));

  if (sections.productOnlyInstructions) {
    lines.push("", "=== PRODUCT-ONLY MODE ===");
    sections.productOnlyInstructions.forEach((r) => lines.push(`- ${r}`));
  } else if (sections.model) {
    lines.push("", "=== MODEL ===");
    lines.push(`Preset: ${sections.model.presetName}`);
    lines.push(`Gender: ${sections.model.gender}`);
    lines.push(`Age range: ${sections.model.ageRange}`);
    lines.push(`Skin tone: ${sections.model.skinTone}`);
    lines.push(`Hair: ${sections.model.hair}, ${sections.model.hairStyle}`);
    lines.push(`Body type: ${sections.model.bodyType}`);
  }

  lines.push("", "=== POSE ===", sections.pose);
  lines.push("", "=== STYLE ===", sections.style);
  lines.push("", "=== BACKGROUND ===", sections.background);
  lines.push("", "=== LIGHTING ===", sections.lighting);
  lines.push(
    "",
    "=== CAMERA ===",
    `Photography style: ${sections.camera.style}`,
    `Framing: ${sections.camera.framing}`,
    `Aspect ratio: ${sections.camera.aspectRatio}`,
  );

  lines.push("", "Quality requirements:");
  sections.qualityRequirements.forEach((r) => lines.push(`- ${r}`));

  if (sections.customInstructions) {
    lines.push("", "=== ADDITIONAL INSTRUCTIONS ===", sections.customInstructions);
  }

  return lines.join("\n");
}

/** Build prompt for a single pose generation */
export function buildPosePrompt(
  clothing: AIClothingReference,
  config: PhotoshootConfiguration,
  poseId: PoseId,
): StructuredPrompt {
  const isProductOnly = config.model?.gender === "product-only";
  const modelSection = isProductOnly ? null : buildModelSection(config);

  const sections: Omit<StructuredPrompt, "fullPrompt"> = {
    systemInstructions: SYSTEM_INSTRUCTIONS,
    clothing: buildClothingSection(clothing),
    model: modelSection,
    productOnlyInstructions: isProductOnly ? PRODUCT_ONLY_INSTRUCTIONS : null,
    pose: getPoseLabel(poseId),
    style: config.styleId ? getStyleLabel(config.styleId) : "",
    background: buildBackgroundDescription(config),
    lighting: config.lightingId ? getLightingLabel(config.lightingId) : "",
    camera: {
      style: config.cameraStyleId ? getCameraStyleLabel(config.cameraStyleId) : "",
      framing: getFramingLabel(config.framing),
      aspectRatio: getAspectRatioLabel(config.aspectRatio),
    },
    qualityRequirements: QUALITY_REQUIREMENTS,
    preservationRules: CLOTHING_PRESERVATION_RULES,
    customInstructions: config.customPrompt?.trim() ?? "",
  };

  return { ...sections, fullPrompt: assemblePrompt(sections) };
}

/** @deprecated Use buildPosePrompt for generation — kept for preview summary */
export function buildPhotoshootPrompt(
  clothing: AIClothingReference,
  config: PhotoshootConfiguration,
): StructuredPrompt {
  const firstPose = config.poses[0];
  if (!firstPose) {
    return buildPosePrompt(clothing, config, "standing");
  }
  const prompt = buildPosePrompt(clothing, config, firstPose);
  return {
    ...prompt,
    fullPrompt: [
      prompt.fullPrompt,
      "",
      "=== ALL SELECTED POSES (reference) ===",
      ...config.poses.map((p) => `- ${getPoseLabel(p)}`),
    ].join("\n"),
  };
}

export function buildGenerationRequest(input: CompletePhotoshootConfiguration) {
  const poses = input.config.poses;

  return {
    clothingReference: input.clothing,
    configuration: input.config,
    aspectRatio: input.config.aspectRatio,
    numberOfImages: poses.length,
    poseCount: poses.length,
    poses,
  };
}

export function resolveGenerationCount(
  poseCount: number,
  requestedCount?: number,
  maxCount = 6,
  defaultCount = 4,
): number {
  const capped = Math.min(poseCount, maxCount);
  if (requestedCount === undefined) {
    return Math.min(defaultCount, capped);
  }
  return Math.min(Math.max(1, requestedCount), capped);
}
