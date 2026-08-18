"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ClothingAsset } from "@/types";
import type { PhotoshootRecord } from "@/lib/ai/generation-orchestrator";
import type { VideoConfiguration, VideoSourceType } from "@/types/video";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { buildVideoPrompt } from "@/lib/video/prompt-builder";
import { createVideoJob } from "@/lib/video/client";
import {
  ASPECT_RATIO_OPTIONS,
  CAMERA_MOVEMENT_OPTIONS,
  DEFAULT_VIDEO_CONFIGURATION,
  DURATION_OPTIONS,
  FRAMING_OPTIONS,
  LIGHTING_OPTIONS,
  LENS_OPTIONS,
  MOTION_INTENSITY_OPTIONS,
  RESOLUTION_OPTIONS,
  VIDEO_STYLE_OPTIONS,
  VIDEO_TYPE_OPTIONS,
} from "@/lib/video/presets";
import { getVideoGenerationCost } from "@/lib/credits/config";

interface SourceOption {
  id: string;
  label: string;
  storageKey: string;
  imageUrl: string;
  sourceType: VideoSourceType;
  productId?: string;
  photoshootId?: string;
  sourceImageId?: string;
}

interface VideoCreateWizardProps {
  products: ClothingAsset[];
  photoshoots: PhotoshootRecord[];
  creditsAvailable: number;
}

const STEPS = [
  "Source",
  "Video Type",
  "Motion",
  "Style",
  "Camera",
  "Format",
  "Prompt",
  "Review",
] as const;

function buildSourceOptions(
  products: ClothingAsset[],
  photoshoots: PhotoshootRecord[],
): SourceOption[] {
  const options: SourceOption[] = [];

  for (const product of products) {
    options.push({
      id: `product-${product.id}`,
      label: product.productName,
      storageKey: product.storageKey,
      imageUrl: product.imageUrl,
      sourceType: "product",
      productId: product.id,
    });
  }

  for (const photoshoot of photoshoots) {
    for (const image of photoshoot.images) {
      if (!image.storageKey) continue;
      options.push({
        id: `image-${image.id}`,
        label: `${photoshoot.productName} — ${image.poseLabel}`,
        storageKey: image.storageKey,
        imageUrl: image.imageUrl,
        sourceType: "generated_image",
        productId: photoshoot.productId,
        photoshootId: photoshoot.id,
        sourceImageId: image.id,
      });
    }
  }

  return options;
}

export function VideoCreateWizard({
  products,
  photoshoots,
  creditsAvailable,
}: VideoCreateWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("Fashion Video");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [config, setConfig] = useState<VideoConfiguration>(DEFAULT_VIDEO_CONFIGURATION);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sources = useMemo(
    () => buildSourceOptions(products, photoshoots),
    [products, photoshoots],
  );
  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? null;
  const generatedPrompt = useMemo(() => buildVideoPrompt(config), [config]);
  const estimatedCost = getVideoGenerationCost(config.duration);
  const canAfford = creditsAvailable >= estimatedCost;

  const updateConfig = (partial: Partial<VideoConfiguration>) => {
    setConfig((current) => ({
      ...current,
      ...partial,
      motion: partial.motion ? { ...current.motion, ...partial.motion } : current.motion,
      camera: partial.camera ? { ...current.camera, ...partial.camera } : current.camera,
    }));
  };

  const handleGenerate = async () => {
    if (!selectedSource || !canAfford) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createVideoJob({
        title,
        sourceType: selectedSource.sourceType,
        sourceStorageKey: selectedSource.storageKey,
        sourceImageId: selectedSource.sourceImageId,
        productId: selectedSource.productId,
        photoshootId: selectedSource.photoshootId,
        configuration: config,
        requestId: crypto.randomUUID(),
      });
      router.push(`/video-generation/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start video generation.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <Badge
            key={label}
            variant={index === step ? "default" : index < step ? "muted" : "muted"}
          >
            {index + 1}. {label}
          </Badge>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-medium text-stone-900">Select Source</h2>
            <p className="mt-2 text-sm text-stone-500">
              Choose a product image or a completed photoshoot image as your video source.
            </p>
          </div>
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-10 text-center text-sm text-stone-500">
              Upload a product or complete a photoshoot first.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelectedSourceId(source.id)}
                  className={cn(
                    "overflow-hidden rounded-2xl border text-left transition",
                    selectedSourceId === source.id
                      ? "border-stone-900 ring-2 ring-stone-900/10"
                      : "border-stone-200 hover:border-stone-400",
                  )}
                >
                  <div className="relative aspect-[4/5] bg-stone-100">
                    <Image src={source.imageUrl} alt={source.label} fill className="object-cover" />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-stone-900">{source.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-stone-400">
                      {source.sourceType.replace("_", " ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-4 md:grid-cols-2">
          {VIDEO_TYPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateConfig({ videoType: option.id })}
              className={cn(
                "rounded-2xl border p-6 text-left transition",
                config.videoType === option.id
                  ? "border-stone-900 bg-stone-50"
                  : "border-stone-200 hover:border-stone-400",
              )}
            >
              <h3 className="font-display text-lg font-medium text-stone-900">{option.title}</h3>
              <p className="mt-2 text-sm text-stone-500">{option.description}</p>
            </button>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <OptionGrid
            label="Camera Movement"
            options={CAMERA_MOVEMENT_OPTIONS}
            value={config.motion.cameraMovement}
            onChange={(cameraMovement) =>
              updateConfig({ motion: { ...config.motion, cameraMovement } })
            }
          />
          <OptionGrid
            label="Motion Intensity"
            options={MOTION_INTENSITY_OPTIONS}
            value={config.motion.motionIntensity}
            onChange={(motionIntensity) =>
              updateConfig({ motion: { ...config.motion, motionIntensity } })
            }
          />
          <ToggleGrid
            items={[
              ["modelMovement", "Model movement"],
              ["fabricMovement", "Fabric movement"],
              ["naturalBodyMovement", "Natural body movement"],
              ["hairMovement", "Hair movement"],
              ["backgroundMovement", "Background movement"],
            ]}
            values={config.motion}
            onChange={(motion) => updateConfig({ motion })}
          />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-6">
          <OptionGrid
            label="Style"
            options={VIDEO_STYLE_OPTIONS}
            value={config.style}
            onChange={(style) => updateConfig({ style })}
          />
          <OptionGrid
            label="Lighting"
            options={LIGHTING_OPTIONS}
            value={config.lighting}
            onChange={(lighting) => updateConfig({ lighting })}
          />
        </section>
      )}

      {step === 4 && (
        <section className="space-y-6">
          <OptionGrid
            label="Lens"
            options={LENS_OPTIONS}
            value={config.camera.lens}
            onChange={(lens) => updateConfig({ camera: { ...config.camera, lens } })}
          />
          <OptionGrid
            label="Framing"
            options={FRAMING_OPTIONS}
            value={config.camera.framing}
            onChange={(framing) => updateConfig({ camera: { ...config.camera, framing } })}
          />
        </section>
      )}

      {step === 5 && (
        <section className="space-y-6">
          <OptionGrid
            label="Aspect Ratio"
            options={ASPECT_RATIO_OPTIONS.map((item) => ({
              id: item.id,
              label: `${item.label} — ${item.hint}`,
            }))}
            value={config.aspectRatio}
            onChange={(aspectRatio) => updateConfig({ aspectRatio })}
          />
          <OptionGrid
            label="Resolution"
            options={RESOLUTION_OPTIONS}
            value={config.resolution}
            onChange={(resolution) => updateConfig({ resolution })}
          />
          <OptionGrid
            label="Duration"
            options={DURATION_OPTIONS.map((item) => ({ id: String(item.id), label: item.label }))}
            value={String(config.duration)}
            onChange={(value) => updateConfig({ duration: Number(value) as VideoConfiguration["duration"] })}
          />
        </section>
      )}

      {step === 6 && (
        <section className="space-y-4">
          <label className="block text-sm font-medium text-stone-700">Generated Prompt</label>
          <textarea
            readOnly
            value={generatedPrompt}
            className="min-h-40 w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
          />
          <label className="block text-sm font-medium text-stone-700">Additional Instructions</label>
          <textarea
            value={config.additionalInstructions ?? ""}
            onChange={(event) => updateConfig({ additionalInstructions: event.target.value })}
            className="min-h-24 w-full rounded-2xl border border-stone-200 p-4 text-sm"
            placeholder="Optional creative direction…"
          />
          <label className="block text-sm font-medium text-stone-700">Negative Prompt</label>
          <textarea
            value={config.negativePrompt ?? ""}
            onChange={(event) => updateConfig({ negativePrompt: event.target.value })}
            className="min-h-24 w-full rounded-2xl border border-stone-200 p-4 text-sm"
            placeholder="Things to avoid…"
          />
        </section>
      )}

      {step === 7 && selectedSource && (
        <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100">
            <Image src={selectedSource.imageUrl} alt={selectedSource.label} fill className="object-cover" />
          </div>
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full border-b border-stone-200 pb-2 font-display text-2xl text-stone-900 outline-none"
            />
            <dl className="grid gap-3 text-sm">
              <SummaryRow label="Video type" value={config.videoType.replace(/_/g, " ")} />
              <SummaryRow label="Motion" value={config.motion.cameraMovement.replace(/_/g, " ")} />
              <SummaryRow label="Style" value={config.style.replace(/_/g, " ")} />
              <SummaryRow label="Format" value={`${config.aspectRatio} · ${config.resolution} · ${config.duration}s`} />
              <SummaryRow label="Estimated cost" value={`${estimatedCost} credits`} />
              <SummaryRow label="Available credits" value={`${creditsAvailable} credits`} />
              <SummaryRow
                label="Remaining after"
                value={`${Math.max(creditsAvailable - estimatedCost, 0)} credits`}
              />
            </dl>
            {!canAfford && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Not enough credits. You need {estimatedCost} credits but only have {creditsAvailable}.
              </p>
            )}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between border-t border-stone-100 pt-6">
        <Button
          variant="outline"
          disabled={step === 0 || submitting}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            disabled={(step === 0 && !selectedSource) || submitting}
            onClick={() => setStep((current) => current + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            disabled={!selectedSource || !canAfford || submitting}
            loading={submitting}
            onClick={() => void handleGenerate()}
          >
            Generate Video
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium capitalize text-stone-900">{value}</dd>
    </div>
  );
}

function OptionGrid<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T | string;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-widest text-stone-400">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id as T)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              value === option.id
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 text-stone-700 hover:border-stone-400",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleGrid({
  items,
  values,
  onChange,
}: {
  items: [keyof Pick<
    VideoConfiguration["motion"],
    | "modelMovement"
    | "fabricMovement"
    | "naturalBodyMovement"
    | "hairMovement"
    | "backgroundMovement"
  >, string][];
  values: VideoConfiguration["motion"];
  onChange: (motion: VideoConfiguration["motion"]) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([key, label]) => (
        <label
          key={key}
          className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-sm"
        >
          <span>{label}</span>
          <input
            type="checkbox"
            checked={Boolean(values[key])}
            onChange={(event) => onChange({ ...values, [key]: event.target.checked })}
          />
        </label>
      ))}
    </div>
  );
}
