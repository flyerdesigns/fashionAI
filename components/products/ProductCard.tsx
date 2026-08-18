"use client";

import { cn, formatDate, formatFileSize } from "@/lib/utils";
import {
  getColorLabel,
  getGenderLabel,
  getProductTypeLabel,
} from "@/lib/mock/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ClothingAsset } from "@/types";

interface ProductCardProps {
  product: ClothingAsset;
}

const statusVariant = {
  draft: "muted" as const,
  preparing: "warning" as const,
  ready: "success" as const,
  failed: "default" as const,
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:border-stone-300 hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.productName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute right-3 top-3">
          <Badge variant={statusVariant[product.status]}>
            {product.status === "ready" ? "Ready" : product.status}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-display text-lg font-medium text-stone-900 line-clamp-2">
            {product.productName}
          </h3>
          <p className="mt-1.5 text-sm text-stone-500">
            {getProductTypeLabel(product.productType)} ·{" "}
            {getColorLabel(product.color, product.customColor)} ·{" "}
            {getGenderLabel(product.gender)}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Added {formatDate(product.createdAt)}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button href={`/create?productId=${product.id}`} size="sm" className="flex-1">
            Create Photoshoot
          </Button>
          <Button href={`/products/${product.id}`} variant="outline" size="sm">
            View
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProductImagePreview({
  product,
  className,
}: {
  product: ClothingAsset;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-stone-200 bg-stone-100",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={product.productName}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export function ProductMetaList({ product }: { product: ClothingAsset }) {
  const rows = [
    { label: "Product type", value: getProductTypeLabel(product.productType) },
    { label: "Category", value: getProductTypeLabel(product.category) },
    { label: "Color", value: getColorLabel(product.color, product.customColor) },
    { label: "Gender", value: getGenderLabel(product.gender) },
    { label: "Brand", value: product.brandName || "—" },
    { label: "Original file", value: product.originalFileName },
    { label: "File type", value: product.mimeType.split("/")[1]?.toUpperCase() ?? product.mimeType },
    { label: "File size", value: formatFileSize(product.fileSize) },
    { label: "Dimensions", value: `${product.width} × ${product.height}px` },
    { label: "Created", value: formatDate(product.createdAt) },
  ];

  return (
    <dl className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex justify-between gap-4 border-b border-stone-100 pb-3 last:border-0"
        >
          <dt className="text-sm text-stone-500">{row.label}</dt>
          <dd className="text-right text-sm font-medium text-stone-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
