import { isS3Enabled } from "@/lib/db/config";
import { localStorage } from "./local";
import { getS3Storage } from "./s3";
import type { StorageService } from "./types";

export type { UploadOptions, StorageResult, StorageService } from "./types";

export { LocalStorageService, localStorage } from "./local";
export { S3StorageService, getS3Storage } from "./s3";
export { buildAssetUrl, buildProductImageKey, buildGeneratedImageKey } from "./keys";

let storageInstance: StorageService | null = null;

export function getStorage(): StorageService {
  if (storageInstance) return storageInstance;
  storageInstance = isS3Enabled() ? getS3Storage() : localStorage;
  return storageInstance;
}

/** Active storage provider — local filesystem or S3 */
export const storage: StorageService = {
  upload: (file, filename, options) => getStorage().upload(file, filename, options),
  delete: (key) => getStorage().delete(key),
  getSignedUrl: (key, expiresInSeconds) =>
    getStorage().getSignedUrl(key, expiresInSeconds),
  readFile: (key) => getStorage().readFile(key),
  exists: (key) => getStorage().exists(key),
};
