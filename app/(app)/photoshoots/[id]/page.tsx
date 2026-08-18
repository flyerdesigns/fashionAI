import { PhotoshootDetailClient } from "@/components/photoshoot/PhotoshootDetailClient";

interface PhotoshootDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PhotoshootDetailPage({ params }: PhotoshootDetailPageProps) {
  const { id } = await params;
  return <PhotoshootDetailClient photoshootId={id} />;
}
