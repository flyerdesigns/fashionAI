/**
 * Migrate JSON development data into PostgreSQL.
 *
 * Usage:
 *   npx tsx scripts/migrate-json-to-postgres.ts --dry-run
 *   npx tsx scripts/migrate-json-to-postgres.ts --execute
 *
 * Requires DATABASE_URL and DATABASE_PROVIDER=postgres.
 */
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/db/client";
import { Prisma } from "../lib/generated/prisma";
import type { ClothingAsset } from "../types/clothing";
import type { PhotoshootRecord } from "../lib/ai/generation-orchestrator";
import type { GenerationJob } from "../types/generation-job";
import type { UserRecord } from "../types/user-record";

const DATA_DIR = path.join(process.cwd(), ".data");

interface MigrationPlan {
  users: number;
  products: number;
  photoshoots: number;
  generationJobs: number;
  generationImages: number;
  duplicateEmails: string[];
  duplicateIds: string[];
  missingUserReferences: string[];
}

async function readJson<T>(fileName: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--execute");
  return { dryRun };
}

async function buildPlan(): Promise<MigrationPlan> {
  const users = await readJson<UserRecord>("users.json");
  const products = await readJson<ClothingAsset>("products.json");
  const photoshoots = await readJson<PhotoshootRecord>("photoshoots.json");
  const jobs = await readJson<GenerationJob>("generation-jobs.json");

  const userIds = new Set(users.map((u) => u.id));
  const seenEmails = new Set<string>();
  const duplicateEmails: string[] = [];
  for (const user of users) {
    const email = user.email.toLowerCase();
    if (seenEmails.has(email)) duplicateEmails.push(email);
    seenEmails.add(email);
  }

  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  for (const entity of [...users, ...products, ...photoshoots, ...jobs]) {
    if (seenIds.has(entity.id)) duplicateIds.push(entity.id);
    seenIds.add(entity.id);
  }

  const missingUserReferences: string[] = [];
  for (const product of products) {
    if (!userIds.has(product.userId)) missingUserReferences.push(`product:${product.id}`);
  }
  for (const shoot of photoshoots) {
    if (!userIds.has(shoot.userId)) missingUserReferences.push(`photoshoot:${shoot.id}`);
  }
  for (const job of jobs) {
    if (!userIds.has(job.userId)) missingUserReferences.push(`job:${job.id}`);
  }

  const generationImages = jobs.reduce((sum, job) => sum + job.images.length, 0);

  return {
    users: users.length,
    products: products.length,
    photoshoots: photoshoots.length,
    generationJobs: jobs.length,
    generationImages,
    duplicateEmails,
    duplicateIds,
    missingUserReferences,
  };
}

async function migrate(dryRun: boolean) {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required.");
  }

  const plan = await buildPlan();

  console.info("[migrate-json-to-postgres] Plan:");
  console.info(`  users: ${plan.users}`);
  console.info(`  products: ${plan.products}`);
  console.info(`  photoshoots: ${plan.photoshoots}`);
  console.info(`  generation jobs: ${plan.generationJobs}`);
  console.info(`  generation images: ${plan.generationImages}`);
  console.info(`  duplicate emails: ${plan.duplicateEmails.length}`);
  console.info(`  duplicate ids: ${plan.duplicateIds.length}`);
  console.info(`  missing user references: ${plan.missingUserReferences.length}`);

  if (plan.duplicateEmails.length > 0) {
    console.warn("  duplicate emails:", plan.duplicateEmails.join(", "));
  }
  if (plan.missingUserReferences.length > 0) {
    console.warn("  missing refs:", plan.missingUserReferences.slice(0, 10).join(", "));
  }

  if (dryRun) {
    console.info("[migrate-json-to-postgres] Dry run complete. No data written.");
    return;
  }

  const users = await readJson<UserRecord>("users.json");
  const products = await readJson<ClothingAsset>("products.json");
  const photoshoots = await readJson<PhotoshootRecord>("photoshoots.json");
  const jobs = await readJson<GenerationJob>("generation-jobs.json");

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        image: user.image,
        passwordHash: user.passwordHash,
        provider: user.provider,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
      update: {
        name: user.name,
        image: user.image,
        passwordHash: user.passwordHash,
        provider: user.provider,
        updatedAt: new Date(user.updatedAt),
      },
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        userId: product.userId,
        name: product.productName,
        type: product.productType,
        category: product.category,
        gender: product.gender,
        color: product.color,
        customColor: product.customColor ?? null,
        description: product.description ?? null,
        brand: product.brandName ?? null,
        status: product.status,
        originalFileName: product.originalFileName,
        originalImageKey: product.storageKey,
        originalImageMimeType: product.mimeType,
        originalImageSize: product.fileSize,
        width: product.width,
        height: product.height,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      },
      update: {
        originalImageKey: product.storageKey,
        updatedAt: new Date(product.updatedAt),
      },
    });
  }

  for (const shoot of photoshoots) {
    await prisma.photoshoot.upsert({
      where: { id: shoot.id },
      create: {
        id: shoot.id,
        userId: shoot.userId,
        productId: shoot.productId,
        productNameSnapshot: shoot.productName,
        clothingThumbnailUrl: shoot.clothingThumbnailUrl ?? null,
        configuration: shoot.configuration as unknown as Prisma.InputJsonValue,
        generationId: shoot.generationId,
        generationJobId: shoot.generationJobId,
        status: shoot.status,
        provider: shoot.provider,
        totalImages: shoot.totalImages,
        completedImages: shoot.completedImages,
        createdAt: new Date(shoot.createdAt),
        updatedAt: new Date(shoot.updatedAt),
      },
      update: {
        status: shoot.status,
        generationJobId: shoot.generationJobId,
        completedImages: shoot.completedImages,
        updatedAt: new Date(shoot.updatedAt),
      },
    });
  }

  for (const job of jobs) {
    await prisma.generationJob.upsert({
      where: { id: job.id },
      create: {
        id: job.id,
        userId: job.userId,
        photoshootId: job.photoshootId,
        productId: job.productId,
        provider: job.provider,
        type: job.type,
        status: job.status,
        requestId: job.requestId,
        totalImages: job.totalImages,
        completedImages: job.completedImages,
        failedImages: job.failedImages,
        currentImage: job.currentImage,
        progress: job.progress,
        error: job.error,
        errorCategory: job.errorCategory,
        targetImageId: job.targetImageId,
        startedAt: job.startedAt ? new Date(job.startedAt) : null,
        completedAt: job.completedAt ? new Date(job.completedAt) : null,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      },
      update: {
        status: job.status,
        completedImages: job.completedImages,
        failedImages: job.failedImages,
        progress: job.progress,
        updatedAt: new Date(job.updatedAt),
      },
    });

    for (const image of job.images) {
      await prisma.generationImage.upsert({
        where: { id: image.id },
        create: {
          id: image.id,
          generationJobId: job.id,
          photoshootId: job.photoshootId,
          imageAssetId: image.imageAssetId,
          poseId: image.poseId,
          poseName: image.poseName,
          index: image.index,
          status: image.status,
          storageKey: image.storageKey,
          mimeType: image.storageKey ? "image/png" : null,
          error: image.error,
          errorCategory: image.errorCategory,
          startedAt: image.startedAt ? new Date(image.startedAt) : null,
          completedAt: image.completedAt ? new Date(image.completedAt) : null,
          createdAt: new Date(),
        },
        update: {
          status: image.status,
          storageKey: image.storageKey,
          error: image.error,
          errorCategory: image.errorCategory,
          completedAt: image.completedAt ? new Date(image.completedAt) : null,
        },
      });
    }
  }

  console.info("[migrate-json-to-postgres] Migration complete.");
}

const { dryRun } = parseArgs();
migrate(dryRun)
  .catch((error) => {
    console.error("[migrate-json-to-postgres] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL?.trim()) {
      await prisma.$disconnect();
    }
  });
