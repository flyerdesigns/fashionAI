"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ProductImagePreview,
  ProductMetaList,
} from "@/components/products/ProductCard";
import { DeleteProductModal } from "@/components/products/DeleteProductModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ClothingAsset } from "@/types";
import { deleteProduct, fetchProduct } from "@/lib/products/client";

interface ProductDetailPageProps {
  productId: string;
}

export function ProductDetailClient({ productId }: ProductDetailPageProps) {
  const router = useRouter();
  const [product, setProduct] = useState<ClothingAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProduct(productId)
      .then(setProduct)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete product.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) return <LoadingState message="Loading product…" className="py-24" />;

  if (error || !product) {
    return (
      <EmptyState
        title="Product not found"
        description={error ?? "This product may have been deleted."}
        action={<Button href="/products" variant="outline">Back to products</Button>}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={product.productName}
        description={product.description ?? "Clothing asset prepared for AI photoshoot generation."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href={`/create?productId=${product.id}`}>Create Photoshoot</Button>
            <Button href={`/products/${product.id}/edit`} variant="outline">
              Edit Details
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              Delete Product
            </Button>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductImagePreview product={product} className="aspect-[4/5] lg:aspect-auto lg:min-h-[520px]" />
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-medium text-stone-900">Product details</h2>
            <Badge variant={product.status === "ready" ? "success" : "muted"}>
              {product.status === "ready" ? "Ready" : product.status}
            </Badge>
          </div>
          <ProductMetaList product={product} />
          {product.description && (
            <div className="border-t border-stone-100 pt-4">
              <h3 className="text-sm font-medium text-stone-900">Description</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <DeleteProductModal
        open={deleteOpen}
        productName={product.productName}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
