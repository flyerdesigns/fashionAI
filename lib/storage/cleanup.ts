import { getStorage } from "./index";
import { prisma } from "@/lib/db/client";

export interface OrphanedObjectReport {
  storageKey: string;
  reason: string;
}

/**
 * Identifies S3/local objects that are not referenced by any database record.
 * Does not delete anything automatically.
 */
export async function findOrphanedStorageKeys(
  knownKeys: string[],
): Promise<OrphanedObjectReport[]> {
  const referenced = new Set<string>();

  const [products, images] = await Promise.all([
    prisma.product.findMany({ select: { originalImageKey: true } }),
    prisma.generationImage.findMany({
      where: { storageKey: { not: null } },
      select: { storageKey: true },
    }),
  ]);

  for (const product of products) referenced.add(product.originalImageKey);
  for (const image of images) {
    if (image.storageKey) referenced.add(image.storageKey);
  }

  return knownKeys
    .filter((key) => !referenced.has(key))
    .map((storageKey) => ({
      storageKey,
      reason: "No matching product or generation image record",
    }));
}

export async function storageObjectExists(key: string): Promise<boolean> {
  return getStorage().exists(key);
}
