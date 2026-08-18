"use client";

import { cn } from "@/lib/utils";
import type { ProductType } from "@/types";
import { PRODUCT_TYPES } from "@/lib/mock/constants";

interface ProductTypeSelectorProps {
  value: ProductType | null;
  onChange: (type: ProductType) => void;
  className?: string;
}

export function ProductTypeSelector({
  value,
  onChange,
  className,
}: ProductTypeSelectorProps) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-sm font-medium text-stone-900">
        Product type
      </legend>
      <p className="text-sm text-stone-500">
        Select the garment type to help the AI pipeline understand your product.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {PRODUCT_TYPES.map((type) => {
          const isSelected = value === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
