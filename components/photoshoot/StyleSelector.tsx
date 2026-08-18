"use client";

import { useState } from "react";
import type { StyleCategory, StyleId } from "@/types";
import {
  STYLE_CATEGORIES,
  getStylesByCategory,
} from "@/lib/mock/style-presets";
import { SelectionCard } from "@/components/photoshoot/SelectionCard";
import { cn } from "@/lib/utils";

interface StyleSelectorProps {
  value: StyleId | null;
  onChange: (styleId: StyleId) => void;
}

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  const [category, setCategory] = useState<StyleCategory>("studio");
  const styles = getStylesByCategory(category);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STYLE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all",
              category === cat.value
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {styles.map((style) => (
          <SelectionCard
            key={style.id}
            name={style.name}
            description={style.description}
            previewUrl={style.previewUrl}
            selected={value === style.id}
            badge="Style"
            onClick={() => onChange(style.id)}
          />
        ))}
      </div>
    </div>
  );
}

export { SelectionCard as StyleCard } from "@/components/photoshoot/SelectionCard";
