"use client";

import { useEffect, useState } from "react";
import type { ClothingAsset } from "@/types";
import { fetchProducts } from "@/lib/products/client";
import { ProductCard } from "@/components/products/ProductCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { IconShirt } from "@/components/ui/icons";

export function ProductLibrary() {
  const [products, setProducts] = useState<ClothingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Loading products…" />;
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load products"
        description={error}
        action={
          <Button onClick={() => window.location.reload()} variant="outline">
            Try again
          </Button>
        }
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<IconShirt className="h-6 w-6" />}
        title="No products yet"
        description="Upload clothing through the create flow to build your product library."
        action={<Button href="/create">Upload clothing</Button>}
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
