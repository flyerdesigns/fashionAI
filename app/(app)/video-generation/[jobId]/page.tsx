import { PageHeader } from "@/components/layout/PageHeader";
import { VideoGenerationProgress } from "@/components/video/VideoGenerationProgress";

interface VideoGenerationPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function VideoGenerationPage({ params }: VideoGenerationPageProps) {
  const { jobId } = await params;

  return (
    <>
      <PageHeader
        title="Generating Video"
        description="Your fashion video is being created. You can leave this page — generation continues in the background."
      />
      <VideoGenerationProgress jobId={jobId} />
    </>
  );
}
