import { PageHeader } from "@/components/layout/PageHeader";
import { GenerationProgress } from "@/components/photoshoot/GenerationProgress";

interface GenerationPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function GenerationPage({ params }: GenerationPageProps) {
  const { jobId } = await params;

  return (
    <>
      <PageHeader
        title="Generating Photoshoot"
        description="Your fashion photos are being created. You can leave this page — generation continues in the background."
      />
      <GenerationProgress jobId={jobId} />
    </>
  );
}
