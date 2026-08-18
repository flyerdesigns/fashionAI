export function buildAssetUrl(key: string): string {
  return `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function buildProductImageKey(
  userId: string,
  productId: string,
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `users/${userId}/products/${productId}/original/${safe}`;
}

export function buildGeneratedImageKey(
  userId: string,
  photoshootId: string,
  imageId: string,
  extension = "png",
): string {
  return `users/${userId}/photoshoots/${photoshootId}/generated/${imageId}.${extension}`;
}

export function buildGeneratedVideoKey(
  userId: string,
  videoId: string,
  extension = "mp4",
): string {
  return `users/${userId}/videos/${videoId}/video.${extension}`;
}

export function buildVideoThumbnailKey(userId: string, videoId: string): string {
  return `users/${userId}/videos/${videoId}/thumbnail.jpg`;
}

export function parseUserIdFromStorageKey(storageKey: string): string | null {
  const match = /^users\/([^/]+)\//.exec(storageKey);
  return match?.[1] ?? null;
}

/** Legacy local keys — products/uuid-file, generated/uuid-file */
export function isLegacyStorageKey(key: string): boolean {
  return key.startsWith("products/") || key.startsWith("generated/");
}
