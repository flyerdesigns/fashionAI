"use client";

import type { CreateClothingAssetInput, PresetColor, ProductCategory, ProductType, Gender } from "@/types";
import { ProductTypeSelector } from "@/components/products/ProductTypeSelector";
import { CategorySelector } from "@/components/products/CategorySelector";
import { ColorSelector } from "@/components/products/ColorSelector";
import { GenderSelector } from "@/components/products/GenderSelector";
import { validateProductForm, type ProductFormErrors } from "@/lib/validation/product-form";

export type ClothingDetailsFormData = CreateClothingAssetInput;

interface ClothingDetailsFormProps {
  initialData: Partial<ClothingDetailsFormData>;
  onChange: (data: ClothingDetailsFormData) => void;
  errors: ProductFormErrors;
  showErrors: boolean;
}

export function ClothingDetailsForm({
  initialData,
  onChange,
  errors,
  showErrors,
}: ClothingDetailsFormProps) {
  const data: ClothingDetailsFormData = {
    productName: initialData.productName ?? "",
    productType: initialData.productType ?? "t-shirt",
    category: initialData.category ?? initialData.productType ?? "t-shirt",
    gender: initialData.gender ?? "unisex",
    color: initialData.color ?? "black",
    customColor: initialData.customColor ?? "",
    description: initialData.description ?? "",
    brandName: initialData.brandName ?? "",
  };

  const update = (partial: Partial<ClothingDetailsFormData>) => {
    onChange({ ...data, ...partial });
  };

  return (
    <div className="space-y-8">
      <div>
        <label htmlFor="productName" className="text-sm font-medium text-stone-900">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          id="productName"
          type="text"
          value={data.productName}
          onChange={(e) => update({ productName: e.target.value })}
          placeholder="Premium Cotton Oversized T-Shirt"
          className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
          aria-invalid={showErrors && !!errors.productName}
        />
        {showErrors && errors.productName && (
          <p className="mt-1.5 text-sm text-red-600" role="alert">
            {errors.productName}
          </p>
        )}
      </div>

      <ProductTypeSelector
        value={data.productType}
        onChange={(productType: ProductType) => {
          update({
            productType,
            category: data.category === data.productType ? productType : data.category,
          });
        }}
      />
      {showErrors && errors.productType && (
        <p className="text-sm text-red-600" role="alert">{errors.productType}</p>
      )}

      <CategorySelector
        value={data.category}
        onChange={(category: ProductCategory) => update({ category })}
        error={showErrors ? errors.category : undefined}
      />

      <GenderSelector
        value={data.gender}
        onChange={(gender: Gender) => update({ gender })}
        error={showErrors ? errors.gender : undefined}
      />

      <ColorSelector
        value={data.color}
        customColor={data.customColor ?? ""}
        onColorChange={(color: PresetColor) => update({ color })}
        onCustomColorChange={(customColor) => update({ customColor })}
        error={showErrors ? errors.color : undefined}
      />

      <div>
        <label htmlFor="description" className="text-sm font-medium text-stone-900">
          Description{" "}
          <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea
          id="description"
          value={data.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          rows={4}
          placeholder="Describe the garment, fabric, design, pattern, embroidery, fit, or other important details."
          className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </div>

      <div>
        <label htmlFor="brandName" className="text-sm font-medium text-stone-900">
          Brand Name{" "}
          <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          id="brandName"
          type="text"
          value={data.brandName ?? ""}
          onChange={(e) => update({ brandName: e.target.value })}
          placeholder="Your brand name"
          className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </div>
    </div>
  );
}

export { validateProductForm };
