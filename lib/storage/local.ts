import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { StorageService, StorageResult, UploadOptions } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

function resolveUploadPath(key: string): string {
  const normalized = path.normalize(key).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(UPLOADS_DIR, normalized);
  if (!fullPath.startsWith(UPLOADS_DIR)) {
    throw new Error("Invalid storage key.");
  }
  return fullPath;
}

/**
 * Local filesystem storage for development.
 * Replace with S3/R2 implementation in production without changing the UI.
 */
export class LocalStorageService implements StorageService {
  async upload(
    file: Buffer | Blob,
    filename: string,
    options: UploadOptions,
  ): Promise<StorageResult> {
    await ensureUploadsDir();

    const folder = options.folder ?? "products";
    const safeName = sanitizeFilename(filename);
    const key =
      options.key ?? `${folder}/${randomUUID()}-${safeName}`;
    const filePath = resolveUploadPath(key);

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const buffer = file instanceof Buffer
      ? file
      : Buffer.from(await (file as Blob).arrayBuffer());

    await fs.writeFile(filePath, buffer);

    const { metrics } = await import("@/lib/metrics");
    metrics.storageUploadTotal.inc({ provider: "local" });

    return {
      key,
      url: `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = resolveUploadPath(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  async readFile(key: string): Promise<Buffer> {
    const filePath = resolveUploadPath(key);
    return fs.readFile(filePath);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(resolveUploadPath(key));
      return true;
    } catch {
      return false;
    }
  }

  getAbsolutePath(key: string): string {
    return resolveUploadPath(key);
  }
}

export const localStorage = new LocalStorageService();
