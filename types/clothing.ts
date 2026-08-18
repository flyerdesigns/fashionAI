export type ProductType =
  | "t-shirt"
  | "shirt"
  | "dress"
  | "saree"
  | "kurta"
  | "lehenga"
  | "jacket"
  | "jeans"
  | "pants"
  | "suit"
  | "skirt"
  | "top"
  | "blouse"
  | "other";

export type ProductCategory = ProductType;

export type Gender = "women" | "men" | "unisex" | "kids";

export type PresetColor =
  | "black"
  | "white"
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "pink"
  | "purple"
  | "brown"
  | "beige"
  | "grey"
  | "orange"
  | "multicolor"
  | "other";

export type ClothingAssetStatus =
  | "draft"
  | "preparing"
  | "ready"
  | "failed";

export interface ClothingAsset {
  id: string;
  userId: string;
  productName: string;
  productType: ProductType;
  category: ProductCategory;
  gender: Gender;
  color: PresetColor;
  customColor?: string;
  description?: string;
  brandName?: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  imageUrl: string;
  storageKey: string;
  createdAt: string;
  updatedAt: string;
  status: ClothingAssetStatus;
}

/** Data prepared for future AI image generation — Step 3+ */
export interface AIClothingReference {
  imageUrl: string;
  productType: ProductType;
  category: ProductCategory;
  color: PresetColor;
  customColor?: string;
  gender: Gender;
  description?: string;
  brandName?: string;
  productName: string;
}

export interface CreateClothingAssetInput {
  productName: string;
  productType: ProductType;
  category: ProductCategory;
  gender: Gender;
  color: PresetColor;
  customColor?: string;
  description?: string;
  brandName?: string;
}

export interface UpdateClothingAssetInput {
  productName?: string;
  productType?: ProductType;
  category?: ProductCategory;
  gender?: Gender;
  color?: PresetColor;
  customColor?: string;
  description?: string;
  brandName?: string;
}

/** @deprecated Use ClothingAsset — kept for backward compatibility */
export interface Product {
  id: string;
  name: string;
  type: ProductType;
  thumbnailUrl: string;
  createdAt: string;
}

export function clothingAssetToProduct(asset: ClothingAsset): Product {
  return {
    id: asset.id,
    name: asset.productName,
    type: asset.productType,
    thumbnailUrl: asset.imageUrl,
    createdAt: asset.createdAt,
  };
}

export function toAIClothingReference(asset: ClothingAsset): AIClothingReference {
  return {
    imageUrl: asset.imageUrl,
    productType: asset.productType,
    category: asset.category,
    color: asset.color,
    customColor: asset.customColor,
    gender: asset.gender,
    description: asset.description,
    brandName: asset.brandName,
    productName: asset.productName,
  };
}
