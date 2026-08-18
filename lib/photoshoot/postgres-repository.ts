import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/generated/prisma";
import { mapPhotoshoot } from "@/lib/db/mappers";
import type { PhotoshootRecord } from "@/lib/ai/generation-orchestrator";
import type { PhotoshootRepository } from "./repository";

export class PostgresPhotoshootRepository implements PhotoshootRepository {
  async findAllByUserId(userId: string): Promise<PhotoshootRecord[]> {
    const records = await prisma.photoshoot.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(records.map((record) => this.loadWithImages(record.id)));
  }

  async findById(id: string): Promise<PhotoshootRecord | null> {
    const record = await prisma.photoshoot.findUnique({ where: { id } });
    if (!record) return null;
    return this.loadWithImages(record.id);
  }

  async findByIdForUser(id: string, userId: string): Promise<PhotoshootRecord | null> {
    const record = await prisma.photoshoot.findFirst({ where: { id, userId } });
    if (!record) return null;
    return this.loadWithImages(record.id);
  }

  async findByImageStorageKey(storageKey: string): Promise<PhotoshootRecord | null> {
    const image = await prisma.generationImage.findFirst({
      where: { storageKey },
    });
    if (!image) return null;
    return this.findById(image.photoshootId);
  }

  async hasPhotoshootsForProduct(productId: string): Promise<boolean> {
    const count = await prisma.photoshoot.count({ where: { productId } });
    return count > 0;
  }

  async create(
    data: Omit<PhotoshootRecord, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<PhotoshootRecord> {
    const record = await prisma.photoshoot.create({
      data: {
        id: options?.id ?? randomUUID(),
        userId: data.userId,
        productId: data.productId,
        productNameSnapshot: data.productName,
        clothingThumbnailUrl: data.clothingThumbnailUrl ?? null,
        configuration: data.configuration as unknown as Prisma.InputJsonValue,
        generationId: data.generationId,
        generationJobId: data.generationJobId ?? null,
        status: data.status,
        provider: data.provider,
        totalImages: data.totalImages,
        completedImages: data.completedImages,
      },
    });
    return mapPhotoshoot(record, []);
  }

  async update(id: string, data: Partial<PhotoshootRecord>): Promise<PhotoshootRecord | null> {
    try {
      const { images: _unusedImages, ...rest } = data;
      const record = await prisma.photoshoot.update({
        where: { id },
        data: {
          ...(rest.productName !== undefined ? { productNameSnapshot: rest.productName } : {}),
          ...(rest.clothingThumbnailUrl !== undefined
            ? { clothingThumbnailUrl: rest.clothingThumbnailUrl }
            : {}),
          ...(rest.configuration !== undefined
            ? { configuration: rest.configuration as unknown as Prisma.InputJsonValue }
            : {}),
          ...(rest.generationId !== undefined ? { generationId: rest.generationId } : {}),
          ...(rest.generationJobId !== undefined
            ? { generationJobId: rest.generationJobId }
            : {}),
          ...(rest.status !== undefined ? { status: rest.status } : {}),
          ...(rest.provider !== undefined ? { provider: rest.provider } : {}),
          ...(rest.totalImages !== undefined ? { totalImages: rest.totalImages } : {}),
          ...(rest.completedImages !== undefined
            ? { completedImages: rest.completedImages }
            : {}),
        },
      });
      return this.loadWithImages(record.id);
    } catch {
      return null;
    }
  }

  async updateForUser(
    id: string,
    userId: string,
    data: Partial<PhotoshootRecord>,
  ): Promise<PhotoshootRecord | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;
    return this.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        const images = await tx.generationImage.findMany({
          where: { photoshootId: id },
          select: { storageKey: true },
        });
        await tx.generationImage.deleteMany({ where: { photoshootId: id } });
        await tx.photoshoot.delete({ where: { id } });
        return images;
      });
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

  private async loadWithImages(id: string): Promise<PhotoshootRecord> {
    const record = await prisma.photoshoot.findUniqueOrThrow({ where: { id } });
    const images = await prisma.generationImage.findMany({
      where: { photoshootId: id },
      orderBy: { index: "asc" },
    });
    return mapPhotoshoot(record, images);
  }
}
