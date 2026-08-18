import type { ProductType, Gender, PresetColor, ProductCategory } from "@/types";

export interface ProductTypeOption {
  value: ProductType;
  label: string;
}

export interface CategoryOption {
  value: ProductCategory;
  label: string;
}

export interface ColorOption {
  value: PresetColor;
  label: string;
  swatch?: string;
}

export interface GenderOption {
  value: Gender;
  label: string;
}

export const PRODUCT_TYPES: ProductTypeOption[] = [
  { value: "t-shirt", label: "T-Shirt" },
  { value: "shirt", label: "Shirt" },
  { value: "dress", label: "Dress" },
  { value: "saree", label: "Saree" },
  { value: "kurta", label: "Kurta" },
  { value: "lehenga", label: "Lehenga" },
  { value: "jacket", label: "Jacket" },
  { value: "jeans", label: "Jeans" },
  { value: "pants", label: "Pants" },
  { value: "suit", label: "Suit" },
  { value: "skirt", label: "Skirt" },
  { value: "top", label: "Top" },
  { value: "blouse", label: "Blouse" },
  { value: "other", label: "Other" },
];

export const PRODUCT_CATEGORIES: CategoryOption[] = PRODUCT_TYPES;

export const PRESET_COLORS: ColorOption[] = [
  { value: "black", label: "Black", swatch: "#1c1917" },
  { value: "white", label: "White", swatch: "#fafaf9" },
  { value: "red", label: "Red", swatch: "#dc2626" },
  { value: "blue", label: "Blue", swatch: "#2563eb" },
  { value: "green", label: "Green", swatch: "#16a34a" },
  { value: "yellow", label: "Yellow", swatch: "#ca8a04" },
  { value: "pink", label: "Pink", swatch: "#db2777" },
  { value: "purple", label: "Purple", swatch: "#9333ea" },
  { value: "brown", label: "Brown", swatch: "#78350f" },
  { value: "beige", label: "Beige", swatch: "#d6d3d1" },
  { value: "grey", label: "Grey", swatch: "#78716c" },
  { value: "orange", label: "Orange", swatch: "#ea580c" },
  { value: "multicolor", label: "Multicolor", swatch: "linear-gradient(135deg,#dc2626,#2563eb,#ca8a04)" },
  { value: "other", label: "Other", swatch: "#e7e5e4" },
];

export const GENDERS: GenderOption[] = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Kids" },
];

export const PHOTOSHOOT_STEPS = [
  { id: "upload" as const, label: "Upload", number: 1 },
  { id: "details" as const, label: "Details", number: 2 },
  { id: "preparation" as const, label: "Prepare", number: 3 },
  { id: "model" as const, label: "Model", number: 4 },
  { id: "pose" as const, label: "Pose", number: 5 },
  { id: "style" as const, label: "Style", number: 6 },
  { id: "background" as const, label: "Scene", number: 7 },
  { id: "generate" as const, label: "Generate", number: 8 },
];

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_LABEL = "10 MB";
export const MIN_IMAGE_WIDTH = 512;
export const MIN_IMAGE_HEIGHT = 512;

export function getColorLabel(color: PresetColor, customColor?: string): string {
  if (customColor?.trim()) return customColor.trim();
  return PRESET_COLORS.find((c) => c.value === color)?.label ?? color;
}

export function getGenderLabel(gender: Gender): string {
  return GENDERS.find((g) => g.value === gender)?.label ?? gender;
}

export function getProductTypeLabel(type: ProductType): string {
  return PRODUCT_TYPES.find((t) => t.value === type)?.label ?? type;
}
