"use client";

import { cn } from "@/lib/utils";
import type { PresetColor } from "@/types";
import { PRESET_COLORS } from "@/lib/mock/constants";

interface ColorSelectorProps {
  value: PresetColor | null;
  customColor: string;
  onColorChange: (color: PresetColor) => void;
  onCustomColorChange: (value: string) => void;
  error?: string;
}

export function ColorSelector({
  value,
  customColor,
  onColorChange,
  onCustomColorChange,
  error,
}: ColorSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-stone-900">Color</legend>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {PRESET_COLORS.map((color) => {
          const isSelected = value === color.value;
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onColorChange(color.value)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
                isSelected
                  ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900"
                  : "border-stone-200 bg-white hover:border-stone-300",
              )}
            >
              <span
                className="h-6 w-6 rounded-full ring-1 ring-stone-200"
                style={{
                  background:
                    color.value === "multicolor"
                      ? "linear-gradient(135deg,#dc2626,#2563eb,#ca8a04,#16a34a)"
                      : color.swatch,
                }}
              />
              <span className="text-[11px] font-medium text-stone-600">{color.label}</span>
            </button>
          );
        })}
      </div>
      <div>
        <label htmlFor="customColor" className="text-sm text-stone-600">
          Custom color name{" "}
          <span className="text-stone-400">(optional)</span>
        </label>
        <input
          id="customColor"
          type="text"
          value={customColor}
          onChange={(e) => onCustomColorChange(e.target.value)}
          placeholder="e.g. Midnight Navy, Ivory Cream"
          className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
