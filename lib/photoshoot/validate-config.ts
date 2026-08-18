import type { CompletePhotoshootConfiguration, PhotoshootConfiguration } from "@/types/photoshoot-config";
import { MAX_CUSTOM_PROMPT_LENGTH } from "@/types/photoshoot-config";

export interface ConfigValidationError {
  field: string;
  message: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
}

export function validatePhotoshootConfig(
  config: PhotoshootConfiguration,
  hasClothing: boolean,
): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  if (!hasClothing) {
    errors.push({ field: "clothing", message: "A clothing product must be selected." });
  }

  if (!config.model) {
    errors.push({ field: "model", message: "Please select a model preset." });
  }

  if (config.poses.length === 0) {
    errors.push({ field: "poses", message: "Please select at least one pose." });
  }

  if (!config.styleId) {
    errors.push({ field: "style", message: "Please select a photoshoot style." });
  }

  if (!config.backgroundId) {
    errors.push({ field: "background", message: "Please select a background." });
  } else if (
    config.backgroundId === "custom" &&
    !config.customBackground?.trim()
  ) {
    errors.push({
      field: "background",
      message: "Please describe your custom background.",
    });
  }

  if (!config.lightingId) {
    errors.push({ field: "lighting", message: "Please select a lighting style." });
  }

  if (!config.cameraStyleId) {
    errors.push({ field: "camera", message: "Please select a camera / photography style." });
  }

  if (!config.aspectRatio) {
    errors.push({ field: "aspectRatio", message: "Please select an aspect ratio." });
  }

  if (config.customPrompt && config.customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH) {
    errors.push({
      field: "customPrompt",
      message: `Custom instructions must be ${MAX_CUSTOM_PROMPT_LENGTH} characters or fewer.`,
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateModelStep(config: PhotoshootConfiguration): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  if (!config.model) {
    errors.push({ field: "model", message: "Please select a model preset." });
  }
  return { valid: errors.length === 0, errors };
}

export function validatePoseStep(config: PhotoshootConfiguration): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  if (config.poses.length === 0) {
    errors.push({ field: "poses", message: "Please select at least one pose." });
  }
  return { valid: errors.length === 0, errors };
}

export function validateStyleStep(config: PhotoshootConfiguration): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  if (!config.styleId) {
    errors.push({ field: "style", message: "Please select a photoshoot style." });
  }
  return { valid: errors.length === 0, errors };
}

export function validateBackgroundStep(config: PhotoshootConfiguration): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  if (!config.backgroundId) {
    errors.push({ field: "background", message: "Please select a background." });
  } else if (config.backgroundId === "custom" && !config.customBackground?.trim()) {
    errors.push({ field: "background", message: "Please describe your custom background." });
  }
  if (!config.lightingId) {
    errors.push({ field: "lighting", message: "Please select a lighting style." });
  }
  if (!config.cameraStyleId) {
    errors.push({ field: "camera", message: "Please select a camera style." });
  }
  return { valid: errors.length === 0, errors };
}

export function validateCompleteConfig(
  complete: CompletePhotoshootConfiguration,
): ConfigValidationResult {
  return validatePhotoshootConfig(complete.config, !!complete.clothing?.imageUrl);
}
