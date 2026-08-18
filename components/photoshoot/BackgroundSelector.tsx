"use client";

import { cn } from "@/lib/utils";
import type { BackgroundId } from "@/types";
import { BACKGROUND_PRESETS } from "@/lib/mock/background-presets";
import { SelectionCard } from "@/components/photoshoot/SelectionCard";

interface BackgroundSelectorProps {
  value: BackgroundId | null;
  customBackground: string;
  onChange: (backgroundId: BackgroundId) => void;
  onCustomBackgroundChange: (value: string) => void;
}

export function BackgroundSelector({
  value,
  customBackground,
  onChange,
  onCustomBackgroundChange,
}: BackgroundSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BACKGROUND_PRESETS.map((bg) => (
          <SelectionCard
            key={bg.id}
            name={bg.name}
            description={bg.description}
            previewUrl={bg.previewUrl}
            selected={value === bg.id}
            badge="Location"
            aspect="square"
            onClick={() => onChange(bg.id)}
          />
        ))}
      </div>

      {value === "custom" && (
        <div>
          <label htmlFor="customBackground" className="text-sm font-medium text-stone-900">
            Custom Background
          </label>
          <textarea
            id="customBackground"
            value={customBackground}
            onChange={(e) => onCustomBackgroundChange(e.target.value)}
            rows={3}
            placeholder="Luxury marble interior with soft natural window lighting."
            className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </div>
      )}
    </div>
  );
}

export function LightingSelector({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (id: string) => void;
  options: { id: string; name: string; description: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            "rounded-xl border p-4 text-left transition-all",
            value === opt.id
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 bg-white hover:border-stone-300",
          )}
        >
          <p className="font-medium">{opt.name}</p>
          <p
            className={cn(
              "mt-1 text-xs",
              value === opt.id ? "text-stone-300" : "text-stone-500",
            )}
          >
            {opt.description}
          </p>
        </button>
      ))}
    </div>
  );
}

export function CameraSelector({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (id: string) => void;
  options: { id: string; name: string; description: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            "rounded-xl border p-4 text-left transition-all",
            value === opt.id
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 bg-white hover:border-stone-300",
          )}
        >
          <p className="font-medium">{opt.name}</p>
          <p
            className={cn(
              "mt-1 text-xs",
              value === opt.id ? "text-stone-300" : "text-stone-500",
            )}
          >
            {opt.description}
          </p>
        </button>
      ))}
    </div>
  );
}

export function AspectRatioSelector({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string; description: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            "rounded-xl border px-4 py-3 text-center transition-all min-w-[72px]",
            value === opt.id
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 bg-white hover:border-stone-300",
          )}
        >
          <p className="text-sm font-medium">{opt.label}</p>
          <p
            className={cn(
              "text-[10px]",
              value === opt.id ? "text-stone-300" : "text-stone-400",
            )}
          >
            {opt.description}
          </p>
        </button>
      ))}
    </div>
  );
}

export function FramingSelector({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
            value === opt.id
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 bg-white hover:border-stone-300",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
