export { prisma } from "./client";
export {
  getDatabaseProvider,
  getStorageProvider,
  isPostgresEnabled,
  isS3Enabled,
} from "./config";
export type { DatabaseProvider, StorageProvider } from "./config";
