import type { CreateClothingAssetInput, Gender, PresetColor, ProductCategory, ProductType } from "@/types";
import { GENDERS, PRESET_COLORS, PRODUCT_CATEGORIES, PRODUCT_TYPES } from "@/lib/mock/constants";

export interface ProductFormErrors {
  productName?: string;
  productType?: string;
  category?: string;
  gender?: string;
  color?: string;
}

const PRODUCT_TYPE_VALUES = new Set(PRODUCT_TYPES.map((t) => t.value));
const CATEGORY_VALUES = new Set(PRODUCT_CATEGORIES.map((c) => c.value));
const GENDER_VALUES = new Set(GENDERS.map((g) => g.value));
const COLOR_VALUES = new Set(PRESET_COLORS.map((c) => c.value));

export function validateProductForm(
  data: Partial<CreateClothingAssetInput>,
): { valid: boolean; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};

  if (!data.productName?.trim()) {
    errors.productName = "Product name is required.";
  } else if (data.productName.trim().length < 2) {
    errors.productName = "Product name must be at least 2 characters.";
  }

  if (!data.productType || !PRODUCT_TYPE_VALUES.has(data.productType)) {
    errors.productType = "Please select a product type.";
  }

  if (!data.category || !CATEGORY_VALUES.has(data.category)) {
    errors.category = "Please select a category.";
  }

  if (!data.gender || !GENDER_VALUES.has(data.gender)) {
    errors.gender = "Please select a gender.";
  }

  if (!data.color || !COLOR_VALUES.has(data.color)) {
    errors.color = "Please select a color.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateProductUpdate(
  data: Partial<CreateClothingAssetInput>,
): { valid: boolean; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};

  if (data.productName !== undefined) {
    if (!data.productName.trim()) {
      errors.productName = "Product name is required.";
    } else if (data.productName.trim().length < 2) {
      errors.productName = "Product name must be at least 2 characters.";
    }
  }

  if (data.productType !== undefined && !PRODUCT_TYPE_VALUES.has(data.productType)) {
    errors.productType = "Invalid product type.";
  }

  if (data.category !== undefined && !CATEGORY_VALUES.has(data.category)) {
    errors.category = "Invalid category.";
  }

  if (data.gender !== undefined && !GENDER_VALUES.has(data.gender)) {
    errors.gender = "Invalid gender.";
  }

  if (data.color !== undefined && !COLOR_VALUES.has(data.color)) {
    errors.color = "Invalid color.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function parseProductFormData(formData: FormData): {
  input: CreateClothingAssetInput;
  errors: ProductFormErrors;
} {
  const input: CreateClothingAssetInput = {
    productName: String(formData.get("productName") ?? ""),
    productType: formData.get("productType") as ProductType,
    category: formData.get("category") as ProductCategory,
    gender: formData.get("gender") as Gender,
    color: formData.get("color") as PresetColor,
    customColor: String(formData.get("customColor") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    brandName: String(formData.get("brandName") ?? "") || undefined,
  };

  const { errors } = validateProductForm(input);
  return { input, errors };
}
