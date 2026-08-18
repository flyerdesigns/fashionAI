import { randomUUID } from "crypto";
import type {
  AIClothingReference,
  ClothingAsset,
  CreateClothingAssetInput,
  UpdateClothingAssetInput,
} from "@/types";
import { toAIClothingReference } from "@/types";
import { storage, buildProductImageKey } from "@/lib/storage";
import { validateImageMetadata } from "@/lib/validation";
import { getImageDimensionsFromBuffer } from "@/lib/validation/image-dimensions";
import { photoshootRepository } from "@/lib/photoshoot/repository";
import { productRepository } from "./repository";

export interface CreateProductWithImageInput extends CreateClothingAssetInput {
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

export class ProductService {
  async listProducts(userId: string): Promise<ClothingAsset[]> {
    return productRepository.findAllByUserId(userId);
  }

  async getProductForUser(id: string, userId: string): Promise<ClothingAsset | null> {
    return productRepository.findByIdForUser(id, userId);
  }

  /** Internal — trusted backend/worker use only */
  async getProductInternal(id: string): Promise<ClothingAsset | null> {
    return productRepository.findById(id);
  }

  async createProduct(userId: string, input: CreateProductWithImageInput): Promise<ClothingAsset> {
    const dimensions = getImageDimensionsFromBuffer(input.fileBuffer, input.mimeType);
    if (!dimensions) {
      throw new ProductServiceError(
        "Unable to read image dimensions. The file may be corrupted.",
        400,
      );
    }

    const validation = validateImageMetadata(
      input.mimeType,
      input.fileSize,
      dimensions.width,
      dimensions.height,
    );

    if (!validation.valid) {
      throw new ProductServiceError(validation.error ?? "Invalid image.", 400);
    }

    const productId = randomUUID();
    const storageKey = buildProductImageKey(
      userId,
      productId,
      input.originalFileName,
    );

    let uploadResult: { key: string; url: string };
    try {
      uploadResult = await storage.upload(
        input.fileBuffer,
        input.originalFileName,
        { key: storageKey, contentType: input.mimeType },
      );
    } catch {
      throw new ProductServiceError(
        "Unable to upload product image. Please try again.",
        503,
      );
    }

    try {
      const asset = await productRepository.create(
        {
          userId,
          productName: input.productName.trim(),
          productType: input.productType,
          category: input.category,
          gender: input.gender,
          color: input.color,
          customColor: input.customColor?.trim() || undefined,
          description: input.description?.trim() || undefined,
          brandName: input.brandName?.trim() || undefined,
          originalFileName: input.originalFileName,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          width: dimensions.width,
          height: dimensions.height,
          imageUrl: uploadResult.url,
          storageKey: uploadResult.key,
          status: "ready",
        },
        { id: productId },
      );

      return asset;
    } catch (error) {
      await storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async updateProduct(
    id: string,
    userId: string,
    data: UpdateClothingAssetInput,
  ): Promise<ClothingAsset> {
    const updated = await productRepository.updateForUser(id, userId, {
      ...data,
      productName: data.productName?.trim(),
      customColor: data.customColor?.trim() || undefined,
      description: data.description?.trim() || undefined,
      brandName: data.brandName?.trim() || undefined,
    });

    if (!updated) {
      throw new ProductServiceError("Product not found.", 404);
    }

    return updated;
  }

  async deleteProduct(id: string, userId: string): Promise<void> {
    const product = await productRepository.findByIdForUser(id, userId);
    if (!product) {
      throw new ProductServiceError("Product not found.", 404);
    }

    const hasPhotoshoots = photoshootRepository.hasPhotoshootsForProduct
      ? await photoshootRepository.hasPhotoshootsForProduct(id)
      : (await photoshootRepository.findAllByUserId(userId)).some(
          (shoot) => shoot.productId === id,
        );

    if (hasPhotoshoots) {
      throw new ProductServiceError(
        "This product cannot be deleted because it has photoshoots. Remove or archive photoshoots first.",
        409,
      );
    }

    await storage.delete(product.storageKey);
    await productRepository.delete(id);
  }

  getAIReference(asset: ClothingAsset): AIClothingReference {
    return toAIClothingReference(asset);
  }
}

export class ProductServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "ProductServiceError";
  }
}

export const productService = new ProductService();
