import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { mapProduct } from "@/lib/db/mappers";
import type {
  ClothingAsset,
  UpdateClothingAssetInput,
} from "@/types";
import type { ProductRepository } from "./repository";

export class PostgresProductRepository implements ProductRepository {
  async findAllByUserId(userId: string): Promise<ClothingAsset[]> {
    const records = await prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(mapProduct);
  }

  async findById(id: string): Promise<ClothingAsset | null> {
    const record = await prisma.product.findUnique({ where: { id } });
    return record ? mapProduct(record) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<ClothingAsset | null> {
    const record = await prisma.product.findFirst({ where: { id, userId } });
    return record ? mapProduct(record) : null;
  }

  async findByStorageKey(storageKey: string): Promise<ClothingAsset | null> {
    const record = await prisma.product.findFirst({ where: { originalImageKey: storageKey } });
    return record ? mapProduct(record) : null;
  }

  async create(
    data: Omit<ClothingAsset, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<ClothingAsset> {
    const record = await prisma.product.create({
      data: {
        id: options?.id ?? randomUUID(),
        userId: data.userId,
        name: data.productName,
        type: data.productType,
        category: data.category,
        gender: data.gender,
        color: data.color,
        customColor: data.customColor ?? null,
        description: data.description ?? null,
        brand: data.brandName ?? null,
        status: data.status,
        originalFileName: data.originalFileName,
        originalImageKey: data.storageKey,
        originalImageMimeType: data.mimeType,
        originalImageSize: data.fileSize,
        width: data.width,
        height: data.height,
      },
    });
    return mapProduct(record);
  }

  async update(id: string, data: UpdateClothingAssetInput): Promise<ClothingAsset | null> {
    try {
      const record = await prisma.product.update({
        where: { id },
        data: mapProductUpdate(data),
      });
      return mapProduct(record);
    } catch {
      return null;
    }
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateClothingAssetInput,
  ): Promise<ClothingAsset | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;
    return this.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.product.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return false;
    return this.delete(id);
  }
}

function mapProductUpdate(data: UpdateClothingAssetInput) {
  return {
    ...(data.productName !== undefined ? { name: data.productName } : {}),
    ...(data.productType !== undefined ? { type: data.productType } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.gender !== undefined ? { gender: data.gender } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.customColor !== undefined ? { customColor: data.customColor ?? null } : {}),
    ...(data.description !== undefined ? { description: data.description ?? null } : {}),
    ...(data.brandName !== undefined ? { brand: data.brandName ?? null } : {}),
  };
}
