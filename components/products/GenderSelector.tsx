"use client";

import { cn } from "@/lib/utils";
import type { Gender } from "@/types";
import { GENDERS } from "@/lib/mock/constants";

interface GenderSelectorProps {
  value: Gender | null;
  onChange: (gender: Gender) => void;
  error?: string;
}

export function GenderSelector({ value, onChange, error }: GenderSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-stone-900">Gender</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GENDERS.map((gender) => {
          const isSelected = value === gender.value;
          return (
            <button
              key={gender.value}
              type="button"
              onClick={() => onChange(gender.value)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              {gender.label}
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
