import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconLayout } from "@/components/ui/icons";

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        title="Templates"
        description="Pre-built photoshoot styles and campaign templates coming in a future step."
      />
      <EmptyState
        icon={<IconLayout className="h-6 w-6" />}
        title="Templates coming soon"
        description="Save and reuse your favorite model, pose, style, and background combinations."
      />
    </>
  );
}
