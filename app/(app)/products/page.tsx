import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ProductLibrary } from "@/components/products/ProductLibrary";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="My Products"
        description="Your clothing library — prepared assets ready for AI photoshoot generation."
        actions={
          <Button href="/create" variant="outline">
            Add product
          </Button>
        }
      />
      <Suspense fallback={<LoadingState message="Loading products…" />}>
        <ProductLibrary />
      </Suspense>
    </>
  );
}
