import { prisma } from "@/lib/db/client";
import { isPostgresEnabled } from "@/lib/db/config";
import { getStorage } from "@/lib/storage";

export interface StorageOrphanReport {
  storageKey: string;
  reason: string;
}

export async function findReferencedStorageKeys(): Promise<Set<string>> {
  const referenced = new Set<string>();

  if (!isPostgresEnabled()) {
    return referenced;
  }

  const [products, images, videos] = await Promise.all([
    prisma.product.findMany({ select: { originalImageKey: true } }),
    prisma.generationImage.findMany({
      where: { storageKey: { not: null } },
      select: { storageKey: true },
    }),
    prisma.video.findMany({
      select: { storageKey: true, thumbnailStorageKey: true, sourceStorageKey: true },
    }),
  ]);

  for (const product of products) referenced.add(product.originalImageKey);
  for (const image of images) {
    if (image.storageKey) referenced.add(image.storageKey);
  }
  for (const video of videos) {
    if (video.storageKey) referenced.add(video.storageKey);
    if (video.thumbnailStorageKey) referenced.add(video.thumbnailStorageKey);
    if (video.sourceStorageKey) referenced.add(video.sourceStorageKey);
  }

  return referenced;
}

export async function findOrphanedStorageKeys(
  candidateKeys: string[],
): Promise<StorageOrphanReport[]> {
  const referenced = await findReferencedStorageKeys();
  return candidateKeys
    .filter((key) => key && !referenced.has(key))
    .map((storageKey) => ({
      storageKey,
      reason: "No matching product, generation image, or video record",
    }));
}

export async function listKnownOrphansFromDatabase(): Promise<StorageOrphanReport[]> {
  if (!isPostgresEnabled()) return [];

  const storage = getStorage();
  const referenced = await findReferencedStorageKeys();
  const orphans: StorageOrphanReport[] = [];

  const videos = await prisma.video.findMany({
    select: { storageKey: true, thumbnailStorageKey: true },
  });

  for (const video of videos) {
    for (const key of [video.storageKey, video.thumbnailStorageKey]) {
      if (!key) continue;
      const exists = await storage.exists(key);
      if (!exists) {
        orphans.push({
          storageKey: key,
          reason: "Video record references missing storage object",
        });
      }
    }
  }

  const danglingKeys = [...referenced];
  for (const key of danglingKeys.slice(0, 200)) {
    const exists = await storage.exists(key);
    if (!exists) {
      orphans.push({
        storageKey: key,
        reason: "Database references missing storage object",
      });
    }
  }

  return orphans;
}

export async function deleteStorageKeys(keys: string[]): Promise<number> {
  const storage = getStorage();
  let deleted = 0;
  for (const key of keys) {
    try {
      await storage.delete(key);
      deleted += 1;
    } catch {
      // skip failures
    }
  }
  return deleted;
}
