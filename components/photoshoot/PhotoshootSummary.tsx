"use client";

import type { AIClothingReference, PhotoshootConfiguration } from "@/types";
import { getColorLabel, getProductTypeLabel } from "@/lib/mock/constants";
import { getModelPreset, getModelGenderLabel, getAgeRangeLabel } from "@/lib/mock/model-presets";
import { getPoseLabel } from "@/lib/mock/pose-presets";
import { getStyleLabel } from "@/lib/mock/style-presets";
import {
  getBackgroundLabel,
  getLightingLabel,
  getCameraStyleLabel,
  getFramingLabel,
  getAspectRatioLabel,
} from "@/lib/mock/background-presets";

interface PhotoshootSummaryProps {
  clothing: AIClothingReference;
  config: PhotoshootConfiguration;
}

export function PhotoshootSummary({ clothing, config }: PhotoshootSummaryProps) {
  const modelPreset = config.model ? getModelPreset(config.model.presetId) : null;

  return (
    <div className="space-y-8">
      <SummarySection title="Clothing">
        <div className="flex gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clothing.imageUrl}
              alt={clothing.productName}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="font-medium text-stone-900">{clothing.productName}</p>
            <p className="mt-1 text-sm text-stone-500">
              {getProductTypeLabel(clothing.productType)} ·{" "}
              {getColorLabel(clothing.color, clothing.customColor)}
            </p>
          </div>
        </div>
      </SummarySection>

      <SummarySection title="Model">
        {config.model ? (
          <div>
            <p className="font-medium text-stone-900">{modelPreset?.name}</p>
            <p className="mt-1 text-sm text-stone-500">
              {getModelGenderLabel(config.model.gender)} ·{" "}
              {getAgeRangeLabel(config.model.ageRange)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-stone-400">Not selected</p>
        )}
      </SummarySection>

      <SummarySection title="Poses">
        {config.poses.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {config.poses.map((pose) => (
              <li
                key={pose}
                className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
              >
                {getPoseLabel(pose)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">None selected</p>
        )}
      </SummarySection>

      <SummarySection title="Style">
        <p className="text-sm text-stone-700">
          {config.styleId ? getStyleLabel(config.styleId) : "Not selected"}
        </p>
      </SummarySection>

      <SummarySection title="Background">
        <p className="text-sm text-stone-700">
          {config.backgroundId === "custom" && config.customBackground?.trim()
            ? config.customBackground
            : config.backgroundId
              ? getBackgroundLabel(config.backgroundId)
              : "Not selected"}
        </p>
      </SummarySection>

      <SummarySection title="Lighting">
        <p className="text-sm text-stone-700">
          {config.lightingId ? getLightingLabel(config.lightingId) : "Not selected"}
        </p>
      </SummarySection>

      <SummarySection title="Camera">
        <p className="text-sm text-stone-700">
          {config.cameraStyleId
            ? `${getCameraStyleLabel(config.cameraStyleId)} · ${getFramingLabel(config.framing)}`
            : "Not selected"}
        </p>
      </SummarySection>

      <SummarySection title="Format">
        <p className="text-sm text-stone-700">
          {getAspectRatioLabel(config.aspectRatio)} aspect ratio
        </p>
      </SummarySection>

      {config.customPrompt?.trim() && (
        <SummarySection title="Custom Instructions">
          <p className="text-sm leading-relaxed text-stone-600">
            {config.customPrompt}
          </p>
        </SummarySection>
      )}
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-stone-100 pb-6 last:border-0">
      <h4 className="text-xs font-medium uppercase tracking-widest text-stone-400">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}
