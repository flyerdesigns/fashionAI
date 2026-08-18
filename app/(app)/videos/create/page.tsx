import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { VideoCreateWizard } from "@/components/video/VideoCreateWizard";
import { requireUser } from "@/lib/auth";
import { productService } from "@/lib/products";
import { photoshootService } from "@/lib/photoshoot/service";

export default async function CreateVideoPage() {
  const user = await requireUser();
  const [products, photoshoots] = await Promise.all([
    productService.listProducts(user.id),
    photoshootService.listPhotoshoots(user.id),
  ]);

  const completedPhotoshoots = photoshoots.filter(
    (photoshoot) =>
      photoshoot.status === "completed" ||
      photoshoot.status === "partially_failed" ||
      photoshoot.images.length > 0,
  );

  return (
    <>
      <PageHeader
        title="Create AI Video"
        description="Transform your product or photoshoot images into premium fashion motion content."
      />
      <Suspense fallback={<LoadingState message="Loading video creator…" className="py-24" />}>
        <VideoCreateWizard
          products={products}
          photoshoots={completedPhotoshoots}
          creditsAvailable={user.creditsRemaining}
        />
      </Suspense>
    </>
  );
}
