"use client";

import { cn, formatFileSize } from "@/lib/utils";
import {
  getColorLabel,
  getProductTypeLabel,
} from "@/lib/mock/constants";
import type { ClothingDetailsFormData } from "@/components/products/ClothingDetailsForm";
import type { UploadedFile } from "@/types";
import { LoadingState } from "@/components/ui/LoadingState";

export type PreparationPhase =
  | "validating"
  | "preparing"
  | "saving"
  | "ready"
  | "error";

interface AssetPreparationPanelProps {
  file: UploadedFile;
  details: ClothingDetailsFormData;
  phase: PreparationPhase;
  error?: string | null;
}

const phaseMessages: Record<PreparationPhase, string> = {
  validating: "Validating image…",
  preparing: "Preparing clothing asset…",
  saving: "Saving product…",
  ready: "Ready",
  error: "Preparation failed",
};

export function AssetPreparationPanel({
  file,
  details,
  phase,
  error,
}: AssetPreparationPanelProps) {
  const isProcessing = phase === "validating" || phase === "preparing" || phase === "saving";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="relative aspect-square bg-stone-100 lg:aspect-auto lg:min-h-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.previewUrl}
              alt={details.productName || "Clothing preview"}
              className="h-full w-full object-contain p-4"
            />
          </div>
          <div className="space-y-6 border-t border-stone-100 p-6 lg:border-t-0 lg:border-l lg:p-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
                Image preparation
              </p>
              <h3 className="mt-1 font-display text-xl font-medium text-stone-900">
                {details.productName || "Untitled product"}
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Standardizing your clothing image for the photoshoot pipeline.
              </p>
            </div>

            <dl className="grid gap-3 text-sm">
              <DetailRow label="File name" value={file.name} />
              <DetailRow label="File type" value={file.type.split("/")[1]?.toUpperCase() ?? file.type} />
              <DetailRow label="File size" value={formatFileSize(file.size)} />
              <DetailRow
                label="Dimensions"
                value={
                  file.width && file.height
                    ? `${file.width} × ${file.height}px`
                    : "Reading…"
                }
              />
              <DetailRow label="Product type" value={getProductTypeLabel(details.productType)} />
              <DetailRow
                label="Color"
                value={getColorLabel(details.color, details.customColor)}
              />
            </dl>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border p-6 transition-colors",
          phase === "ready"
            ? "border-emerald-200 bg-emerald-50/50"
            : phase === "error"
              ? "border-red-200 bg-red-50/50"
              : "border-stone-200 bg-stone-50/50",
        )}
      >
        {isProcessing ? (
          <LoadingState message={phaseMessages[phase]} className="py-8" />
        ) : (
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium",
                phase === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
              )}
            >
              {phase === "ready" ? "✓" : "!"}
            </span>
            <div>
              <p className="font-medium text-stone-900">{phaseMessages[phase]}</p>
              {phase === "ready" && (
                <p className="text-sm text-stone-500">
                  Your clothing asset is saved and ready for model selection.
                </p>
              )}
              {phase === "error" && error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-medium text-stone-900">{value}</dd>
    </div>
  );
}
