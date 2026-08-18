import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { PhotoshootLibrary } from "@/components/photoshoot/PhotoshootLibrary";

export default function PhotoshootsPage() {
  return (
    <>
      <PageHeader
        title="Photoshoots"
        description="Browse and manage your AI-generated fashion photoshoot projects."
        actions={
          <Button href="/create" variant="outline">
            New photoshoot
          </Button>
        }
      />
      <Suspense fallback={null}>
        <PhotoshootLibrary />
      </Suspense>
    </>
  );
}
