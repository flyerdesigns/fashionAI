/**
 * Upload local filesystem images to S3 and update PostgreSQL storage keys.
 *
 * Usage:
 *   npx tsx scripts/migrate-local-storage-to-s3.ts --dry-run
 *   npx tsx scripts/migrate-local-storage-to-s3.ts --execute
 */
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/db/client";
import { getStorage } from "../lib/storage";
import {
  buildGeneratedImageKey,
  buildProductImageKey,
  isLegacyStorageKey,
} from "../lib/storage/keys";
import { localStorage } from "../lib/storage/local";

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

interface UploadPlanItem {
  localKey: string;
  targetKey: string;
  entity: string;
  missingLocalFile: boolean;
}

async function walkUploads(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const keys: string[] = [];

  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      keys.push(...(await walkUploads(fullPath, relative)));
    } else {
      keys.push(relative);
    }
  }

  return keys;
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--execute");
  return { dryRun };
}

async function buildPlan(): Promise<UploadPlanItem[]> {
  const plan: UploadPlanItem[] = [];
  const localKeys = await walkUploads(UPLOADS_DIR);

  const products = await prisma.product.findMany();
  for (const product of products) {
    const key = product.originalImageKey;
    if (!key) continue;

    const targetKey = isLegacyStorageKey(key)
      ? buildProductImageKey(product.userId, product.id, product.originalFileName)
      : key;

    plan.push({
      localKey: key,
      targetKey,
      entity: `product:${product.id}`,
      missingLocalFile: !localKeys.includes(key),
    });
  }

  const images = await prisma.generationImage.findMany({
    where: { storageKey: { not: null } },
    include: { generationJob: { select: { userId: true } } },
  });

  for (const image of images) {
    if (!image.storageKey) continue;
    const targetKey = isLegacyStorageKey(image.storageKey)
      ? buildGeneratedImageKey(
          image.generationJob.userId,
          image.photoshootId,
          image.imageAssetId ?? image.id,
          image.storageKey.split(".").pop() ?? "png",
        )
      : image.storageKey;

    plan.push({
      localKey: image.storageKey,
      targetKey,
      entity: `generationImage:${image.id}`,
      missingLocalFile: !localKeys.includes(image.storageKey),
    });
  }

  return plan;
}

async function migrate(dryRun: boolean) {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required.");
  }
  if (process.env.STORAGE_PROVIDER !== "s3") {
    console.warn("[migrate-local-storage-to-s3] STORAGE_PROVIDER is not s3. Uploads will still target S3 via getStorage().");
  }

  const plan = await buildPlan();
  const missing = plan.filter((item) => item.missingLocalFile);
  const toUpload = plan.filter((item) => !item.missingLocalFile);

  console.info("[migrate-local-storage-to-s3] Plan:");
  console.info(`  objects to upload: ${toUpload.length}`);
  console.info(`  missing local files: ${missing.length}`);
  console.info(`  key remaps: ${plan.filter((p) => p.localKey !== p.targetKey).length}`);

  if (missing.length > 0) {
    console.warn("  missing:", missing.slice(0, 10).map((m) => m.localKey).join(", "));
  }

  if (dryRun) {
    console.info("[migrate-local-storage-to-s3] Dry run complete. No data written.");
    return;
  }

  const storage = getStorage();

  for (const item of toUpload) {
    const buffer = await localStorage.readFile(item.localKey);
    const ext = item.localKey.split(".").pop()?.toLowerCase() ?? "png";
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    await storage.upload(buffer, path.basename(item.targetKey), {
      key: item.targetKey,
      contentType,
    });

    if (item.entity.startsWith("product:")) {
      const productId = item.entity.split(":")[1];
      await prisma.product.update({
        where: { id: productId },
        data: { originalImageKey: item.targetKey },
      });
    }

    if (item.entity.startsWith("generationImage:")) {
      const imageId = item.entity.split(":")[1];
      await prisma.generationImage.update({
        where: { id: imageId },
        data: { storageKey: item.targetKey },
      });
    }
  }

  console.info("[migrate-local-storage-to-s3] Migration complete. Local files were not deleted.");
}

const { dryRun } = parseArgs();
migrate(dryRun)
  .catch((error) => {
    console.error("[migrate-local-storage-to-s3] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL?.trim()) {
      await prisma.$disconnect();
    }
  });
