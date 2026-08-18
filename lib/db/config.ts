export type DatabaseProvider = "json" | "postgres";
export type StorageProvider = "local" | "s3";

export function getDatabaseProvider(): DatabaseProvider {
  const value = process.env.DATABASE_PROVIDER ?? "json";
  return value === "postgres" ? "postgres" : "json";
}

export function getStorageProvider(): StorageProvider {
  const value = process.env.STORAGE_PROVIDER ?? "local";
  return value === "s3" ? "s3" : "local";
}

export function isPostgresEnabled(): boolean {
  return getDatabaseProvider() === "postgres" && !!process.env.DATABASE_URL?.trim();
}

export function isS3Enabled(): boolean {
  return getStorageProvider() === "s3" && !!process.env.AWS_S3_BUCKET?.trim();
}
