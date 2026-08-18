import type { ClothingAsset, CreateClothingAssetInput, UpdateClothingAssetInput } from "@/types";

export class ProductsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "ProductsApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new ProductsApiError(data.error ?? "Request failed.", response.status);
  }
  return data;
}

export async function fetchProducts(): Promise<ClothingAsset[]> {
  const response = await fetch("/api/products", { cache: "no-store" });
  const data = await handleResponse<{ products: ClothingAsset[] }>(response);
  return data.products;
}

export async function fetchProduct(id: string): Promise<ClothingAsset> {
  const response = await fetch(`/api/products/${id}`, { cache: "no-store" });
  const data = await handleResponse<{ product: ClothingAsset }>(response);
  return data.product;
}

export async function createProduct(
  file: File,
  input: CreateClothingAssetInput,
): Promise<ClothingAsset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("productName", input.productName);
  formData.append("productType", input.productType);
  formData.append("category", input.category);
  formData.append("gender", input.gender);
  formData.append("color", input.color);
  if (input.customColor) formData.append("customColor", input.customColor);
  if (input.description) formData.append("description", input.description);
  if (input.brandName) formData.append("brandName", input.brandName);

  const response = await fetch("/api/products", {
    method: "POST",
    body: formData,
  });

  const data = await handleResponse<{ product: ClothingAsset }>(response);
  return data.product;
}

export async function updateProduct(
  id: string,
  input: UpdateClothingAssetInput,
): Promise<ClothingAsset> {
  const response = await fetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await handleResponse<{ product: ClothingAsset }>(response);
  return data.product;
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
  await handleResponse<{ success: boolean }>(response);
}
