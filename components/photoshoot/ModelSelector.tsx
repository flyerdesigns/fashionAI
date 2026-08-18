"use client";

import { cn } from "@/lib/utils";
import type { ModelConfiguration, ModelPresetId } from "@/types";
import {
  MODEL_PRESETS,
  MODEL_GENDERS,
  AGE_RANGES,
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_STYLES,
  BODY_TYPES,
  createModelFromPreset,
} from "@/lib/mock/model-presets";
import { SelectionCard } from "@/components/photoshoot/SelectionCard";

interface ModelSelectorProps {
  value: ModelConfiguration | null;
  onChange: (model: ModelConfiguration) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const selectPreset = (presetId: ModelPresetId) => {
    onChange(createModelFromPreset(presetId));
  };

  const updateModel = (partial: Partial<ModelConfiguration>) => {
    if (!value) return;
    onChange({ ...value, ...partial });
  };

  const updateAppearance = (partial: Partial<ModelConfiguration["appearance"]>) => {
    if (!value) return;
    onChange({
      ...value,
      appearance: { ...value.appearance, ...partial },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium uppercase tracking-widest text-stone-400">
          Model Presets
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Preset reference cards — not AI-generated models.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODEL_PRESETS.map((preset) => (
            <SelectionCard
              key={preset.id}
              name={preset.name}
              description={preset.description}
              previewUrl={preset.previewUrl}
              selected={value?.presetId === preset.id}
              badge="Preset"
              onClick={() => selectPreset(preset.id)}
            />
          ))}
        </div>
      </div>

      {value && (
        <AppearanceSelector
          model={value}
          onGenderChange={(gender) => updateModel({ gender })}
          onAgeChange={(ageRange) => updateModel({ ageRange })}
          onAppearanceChange={updateAppearance}
        />
      )}
    </div>
  );
}

interface AppearanceSelectorProps {
  model: ModelConfiguration;
  onGenderChange: (gender: ModelConfiguration["gender"]) => void;
  onAgeChange: (ageRange: ModelConfiguration["ageRange"]) => void;
  onAppearanceChange: (partial: Partial<ModelConfiguration["appearance"]>) => void;
}

export function AppearanceSelector({
  model,
  onGenderChange,
  onAgeChange,
  onAppearanceChange,
}: AppearanceSelectorProps) {
  const isProductOnly = model.gender === "product-only";

  return (
    <div className="space-y-6 rounded-2xl border border-stone-200 bg-stone-50/50 p-6">
      <h3 className="font-display text-lg font-medium text-stone-900">
        Model Appearance
      </h3>

      <OptionGroup label="Model Gender">
        {MODEL_GENDERS.map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            selected={model.gender === opt.value}
            onClick={() => onGenderChange(opt.value)}
          />
        ))}
      </OptionGroup>

      {!isProductOnly && (
        <>
          <OptionGroup label="Age Range">
            {AGE_RANGES.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={model.ageRange === opt.value}
                onClick={() => onAgeChange(opt.value)}
              />
            ))}
          </OptionGroup>

          <OptionGroup label="Skin Tone">
            {SKIN_TONES.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={model.appearance.skinTone === opt.value}
                onClick={() => onAppearanceChange({ skinTone: opt.value })}
                swatch={opt.swatch}
              />
            ))}
          </OptionGroup>

          <OptionGroup label="Hair">
            {HAIR_COLORS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={model.appearance.hairColor === opt.value}
                onClick={() => onAppearanceChange({ hairColor: opt.value })}
                swatch={opt.swatch}
              />
            ))}
          </OptionGroup>

          {model.appearance.hairColor === "custom" && (
            <div>
              <label htmlFor="customHair" className="text-sm font-medium text-stone-700">
                Custom hair color
              </label>
              <input
                id="customHair"
                type="text"
                value={model.appearance.customHairColor ?? ""}
                onChange={(e) =>
                  onAppearanceChange({ customHairColor: e.target.value })
                }
                placeholder="e.g. Auburn, Platinum"
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>
          )}

          <OptionGroup label="Hair Style">
            {HAIR_STYLES.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={model.appearance.hairStyle === opt.value}
                onClick={() => onAppearanceChange({ hairStyle: opt.value })}
              />
            ))}
          </OptionGroup>

          <OptionGroup label="Body Type">
            {BODY_TYPES.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={model.appearance.bodyType === opt.value}
                onClick={() => onAppearanceChange({ bodyType: opt.value })}
              />
            ))}
          </OptionGroup>
        </>
      )}
    </div>
  );
}

function OptionGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-stone-700">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
  swatch,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
        selected
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-stone-700 hover:border-stone-300",
      )}
    >
      {swatch && (
        <span
          className="h-4 w-4 rounded-full ring-1 ring-stone-200"
          style={{ background: swatch }}
        />
      )}
      {label}
    </button>
  );
}
