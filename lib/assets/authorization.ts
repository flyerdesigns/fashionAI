import { productRepository } from "@/lib/products/repository";
import { photoshootRepository } from "@/lib/photoshoot/repository";
import { parseUserIdFromStorageKey } from "@/lib/storage/keys";
import { isPostgresEnabled } from "@/lib/db/config";
import { postgresVideoRepository } from "@/lib/video/postgres-repository";

export async function resolveAssetOwnerId(storageKey: string): Promise<string | null> {
  const fromPath = parseUserIdFromStorageKey(storageKey);
  if (fromPath) return fromPath;

  const product = await productRepository.findByStorageKey(storageKey);
  if (product?.userId) return product.userId;

  const photoshoot = await photoshootRepository.findByImageStorageKey(storageKey);
  if (photoshoot?.userId) return photoshoot.userId;

  if (isPostgresEnabled()) {
    const video = await postgresVideoRepository.findVideoByStorageKey(storageKey);
    if (video?.userId) return video.userId;
  }

  return null;
}

export async function canUserAccessAsset(
  storageKey: string,
  userId: string,
): Promise<boolean> {
  const ownerId = await resolveAssetOwnerId(storageKey);
  if (!ownerId) return false;
  return ownerId === userId;
}
