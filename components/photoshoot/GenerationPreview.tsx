"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompletePhotoshootConfiguration } from "@/types";
import { validateCompleteConfig } from "@/lib/photoshoot/validate-config";
import {
  createRequestId,
  startPhotoshootGeneration,
} from "@/lib/generation/client";
import {
  calculateGenerationCost,
  getImageGenerationCost,
} from "@/lib/credits/config";
import { PhotoshootSummary } from "@/components/photoshoot/PhotoshootSummary";
import { InsufficientCreditsBanner } from "@/components/credits/InsufficientCreditsBanner";
import { Button } from "@/components/ui/Button";

interface GenerationPreviewProps {
  productId: string;
  complete: CompletePhotoshootConfiguration;
  onBack: () => void;
  creditsAvailable: number;
}

export function GenerationPreview({
  productId,
  complete,
  onBack,
  creditsAvailable,
}: GenerationPreviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const imageCount = complete.config.poses.length;
  const costPerImage = getImageGenerationCost();
  const totalCost = calculateGenerationCost(imageCount, "photoshoot_image");
  const remainingAfter = creditsAvailable - totalCost;
  const insufficientCredits = creditsAvailable < totalCost;

  const handleGenerate = async () => {
    const validation = validateCompleteConfig(complete);
    if (!validation.valid) {
      setValidationErrors(validation.errors.map((e) => e.message));
      return;
    }

    if (insufficientCredits) return;
    if (loading) return;

    setValidationErrors([]);
    setLoading(true);
    setError(null);

    if (!requestIdRef.current) {
      requestIdRef.current = createRequestId();
    }

    try {
      const result = await startPhotoshootGeneration({
        productId,
        configuration: complete.config,
        numberOfImages: complete.config.poses.length,
        requestId: requestIdRef.current,
      });

      router.push(`/generation/${result.jobId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating your photoshoot. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-medium text-stone-900">
          Your Photoshoot
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Review your configuration, then generate premium fashion photos.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-widest text-stone-400">
          Credit Summary
        </h3>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Images</dt>
            <dd className="font-medium text-stone-900">{imageCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Cost per image</dt>
            <dd className="font-medium text-stone-900">{costPerImage} credits</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Total cost</dt>
            <dd className="font-medium text-stone-900">{totalCost} credits</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Available balance</dt>
            <dd className="font-medium text-stone-900">{creditsAvailable} credits</dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt className="text-stone-500">Remaining after generation</dt>
            <dd className="font-medium text-stone-900">
              {insufficientCredits ? "—" : `${remainingAfter} credits`}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-stone-500">
          {imageCount} images × {costPerImage} credits = {totalCost} credits total
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <PhotoshootSummary clothing={complete.clothing} config={complete.config} />
      </div>

      {insufficientCredits && (
        <InsufficientCreditsBanner required={totalCost} available={creditsAvailable} />
      )}

      {validationErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
          <p className="text-sm font-medium text-red-800">
            Please complete the following before generating:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-red-700">
            {validationErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-700">{error}</p>
          {error.toLowerCase().includes("insufficient credits") && (
            <Button className="mt-4" size="sm" href="/settings/billing">
              Get Credits
            </Button>
          )}
          <Button className="mt-4 ml-2" onClick={() => void handleGenerate()}>
            Try Again
          </Button>
        </div>
      )}

      <div className="flex justify-between border-t border-stone-100 pt-6">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button
          onClick={() => void handleGenerate()}
          loading={loading}
          disabled={loading || insufficientCredits}
        >
          Generate Photos
        </Button>
      </div>
    </div>
  );
}
