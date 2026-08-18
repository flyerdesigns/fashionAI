"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ClothingDetailsForm,
  type ClothingDetailsFormData,
  validateProductForm,
} from "@/components/products/ClothingDetailsForm";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchProduct, updateProduct } from "@/lib/products/client";
import type { ProductFormErrors } from "@/lib/validation/product-form";

interface EditProductClientProps {
  productId: string;
}

export function EditProductClient({ productId }: EditProductClientProps) {
  const router = useRouter();
  const [details, setDetails] = useState<ClothingDetailsFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const [showFormErrors, setShowFormErrors] = useState(false);

  useEffect(() => {
    fetchProduct(productId)
      .then((product) =>
        setDetails({
          productName: product.productName,
          productType: product.productType,
          category: product.category,
          gender: product.gender,
          color: product.color,
          customColor: product.customColor ?? "",
          description: product.description ?? "",
          brandName: product.brandName ?? "",
        }),
      )
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSave = async () => {
    if (!details) return;
    const { valid, errors } = validateProductForm(details);
    setFormErrors(errors);
    setShowFormErrors(true);
    if (!valid) return;

    setSaving(true);
    setError(null);
    try {
      await updateProduct(productId, details);
      router.push(`/products/${productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading product…" className="py-24" />;

  if (error && !details) {
    return (
      <EmptyState
        title="Product not found"
        description={error}
        action={<Button href="/products" variant="outline">Back to products</Button>}
      />
    );
  }

  if (!details) return null;

  return (
    <>
      <PageHeader
        title="Edit Product Details"
        description="Update clothing information used for AI photoshoot generation."
      />
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <ClothingDetailsForm
          initialData={details}
          onChange={setDetails}
          errors={formErrors}
          showErrors={showFormErrors}
        />
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-between border-t border-stone-100 pt-6">
          <Button href={`/products/${productId}`} variant="ghost">
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={saving}>
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}
