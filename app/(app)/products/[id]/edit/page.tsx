import { EditProductClient } from "@/components/products/EditProductClient";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  return <EditProductClient productId={id} />;
}
