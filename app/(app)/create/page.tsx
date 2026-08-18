import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreatePhotoshootForm } from "@/components/photoshoot/CreatePhotoshootForm";
import { LoadingState } from "@/components/ui/LoadingState";
import { requireUser } from "@/lib/auth";
import { productService } from "@/lib/products";

interface CreatePageProps {
  searchParams: Promise<{ productId?: string }>;
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const user = await requireUser();
  const { productId } = await searchParams;
  const initialProduct = productId
    ? await productService.getProductForUser(productId, user.id)
    : null;

  return (
    <>
      <PageHeader
        title="Create Photoshoot"
        description="Upload your garment, add clothing details, and prepare your asset for AI photoshoot generation."
      />
      <Suspense fallback={<LoadingState message="Loading create flow…" className="py-24" />}>
        <CreatePhotoshootForm
          initialProduct={initialProduct}
          creditsAvailable={user.creditsRemaining}
        />
      </Suspense>
    </>
  );
}
