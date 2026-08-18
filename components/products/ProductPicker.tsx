"use client";

import { useEffect, useState } from "react";
import type { ClothingAsset } from "@/types";
import { fetchProducts } from "@/lib/products/client";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  getColorLabel,
  getGenderLabel,
  getProductTypeLabel,
} from "@/lib/mock/constants";

interface ProductPickerProps {
  onSelect: (product: ClothingAsset) => void;
  onCancel: () => void;
  selectedId?: string;
}

export function ProductPicker({ onSelect, onCancel, selectedId }: ProductPickerProps) {
  const [products, setProducts] = useState<ClothingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading your products…" />;

  if (error) {
    return (
      <EmptyState
        title="Unable to load products"
        description={error}
        action={<Button onClick={onCancel} variant="outline">Go back</Button>}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products available"
        description="Upload a clothing item first to use it in a photoshoot."
        action={
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline">Go back</Button>
            <Button href="/create">Upload clothing</Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => {
          const isSelected = selectedId === product.id;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product)}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
                isSelected
                  ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900"
                  : "border-stone-200 bg-white hover:border-stone-300",
              )}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.productName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-900">{product.productName}</p>
                <p className="mt-0.5 truncate text-xs text-stone-500">
                  {getProductTypeLabel(product.productType)} ·{" "}
                  {getColorLabel(product.color, product.customColor)} ·{" "}
                  {getGenderLabel(product.gender)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
