"use client";

import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/types";
import { PRODUCT_CATEGORIES } from "@/lib/mock/constants";

interface CategorySelectorProps {
  value: ProductCategory | null;
  onChange: (category: ProductCategory) => void;
  error?: string;
}

export function CategorySelector({ value, onChange, error }: CategorySelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-stone-900">Category</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {PRODUCT_CATEGORIES.map((category) => {
          const isSelected = value === category.value;
          return (
            <button
              key={category.value}
              type="button"
              onClick={() => onChange(category.value)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
