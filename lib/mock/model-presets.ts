import type {
  AgeRange,
  BodyType,
  HairColor,
  HairStyle,
  ModelAppearance,
  ModelConfiguration,
  ModelGender,
  ModelPresetId,
  SkinTone,
} from "@/types/photoshoot-config";

export interface ModelPreset {
  id: ModelPresetId;
  name: string;
  description: string;
  previewUrl: string;
  defaults: Omit<ModelConfiguration, "presetId">;
}

export const MODEL_GENDERS: { value: ModelGender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "product-only", label: "No Model / Product Only" },
];

export const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: "young-adult", label: "Young Adult" },
  { value: "adult", label: "Adult" },
  { value: "mature", label: "Mature" },
];

export const SKIN_TONES: { value: SkinTone; label: string; swatch: string }[] = [
  { value: "fair", label: "Fair", swatch: "#fde8d8" },
  { value: "light", label: "Light", swatch: "#f5d0b5" },
  { value: "medium", label: "Medium", swatch: "#c68642" },
  { value: "tan", label: "Tan", swatch: "#a0714f" },
  { value: "deep", label: "Deep", swatch: "#5c3d2e" },
];

export const HAIR_COLORS: { value: HairColor; label: string; swatch: string }[] = [
  { value: "black", label: "Black", swatch: "#1c1917" },
  { value: "brown", label: "Brown", swatch: "#78350f" },
  { value: "blonde", label: "Blonde", swatch: "#d4a574" },
  { value: "red", label: "Red", swatch: "#b45309" },
  { value: "custom", label: "Custom", swatch: "#e7e5e4" },
];

export const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "long", label: "Long" },
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
  { value: "tied", label: "Tied" },
];

export const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "slim", label: "Slim" },
  { value: "athletic", label: "Athletic" },
  { value: "average", label: "Average" },
  { value: "curvy", label: "Curvy" },
  { value: "plus-size", label: "Plus Size" },
];

const defaultAppearance: ModelAppearance = {
  skinTone: "medium",
  hairColor: "black",
  hairStyle: "long",
  bodyType: "average",
};

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "indian-fashion",
    name: "Indian Fashion Model",
    description: "Female Indian fashion model suitable for ethnic clothing.",
    previewUrl: "/mock/photoshoot/models/indian-fashion.svg",
    defaults: {
      gender: "female",
      ageRange: "adult",
      appearance: {
        skinTone: "medium",
        hairColor: "black",
        hairStyle: "long",
        bodyType: "average",
      },
    },
  },
  {
    id: "luxury-editorial",
    name: "Luxury Editorial",
    description: "High-fashion editorial model suitable for premium campaigns.",
    previewUrl: "/mock/photoshoot/models/luxury-editorial.svg",
    defaults: {
      gender: "female",
      ageRange: "adult",
      appearance: {
        skinTone: "fair",
        hairColor: "brown",
        hairStyle: "straight",
        bodyType: "slim",
      },
    },
  },
  {
    id: "casual-fashion",
    name: "Casual Fashion",
    description: "Modern lifestyle model suitable for everyday clothing.",
    previewUrl: "/mock/photoshoot/models/casual-fashion.svg",
    defaults: {
      gender: "female",
      ageRange: "young-adult",
      appearance: {
        skinTone: "light",
        hairColor: "brown",
        hairStyle: "wavy",
        bodyType: "athletic",
      },
    },
  },
  {
    id: "ecommerce",
    name: "E-commerce Model",
    description: "Clean professional model suitable for product catalog photography.",
    previewUrl: "/mock/photoshoot/models/ecommerce.svg",
    defaults: {
      gender: "female",
      ageRange: "adult",
      appearance: {
        skinTone: "light",
        hairColor: "black",
        hairStyle: "straight",
        bodyType: "average",
      },
    },
  },
  {
    id: "custom",
    name: "Custom Model",
    description: "Configure model appearance manually.",
    previewUrl: "/mock/photoshoot/models/custom.svg",
    defaults: {
      gender: "female",
      ageRange: "adult",
      appearance: { ...defaultAppearance },
    },
  },
];

export function getModelPreset(id: ModelPresetId): ModelPreset | undefined {
  return MODEL_PRESETS.find((p) => p.id === id);
}

export function createModelFromPreset(presetId: ModelPresetId): ModelConfiguration {
  const preset = getModelPreset(presetId) ?? MODEL_PRESETS[0];
  return {
    presetId,
    ...preset.defaults,
    appearance: { ...preset.defaults.appearance },
  };
}

export function getModelGenderLabel(gender: ModelGender): string {
  return MODEL_GENDERS.find((g) => g.value === gender)?.label ?? gender;
}

export function getAgeRangeLabel(age: AgeRange): string {
  return AGE_RANGES.find((a) => a.value === age)?.label ?? age;
}
