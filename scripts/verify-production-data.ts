/**
 * Verify PostgreSQL relationships and S3 object presence.
 *
 * Usage:
 *   npx tsx scripts/verify-production-data.ts
 */
import { prisma } from "../lib/db/client";
import { getStorage } from "../lib/storage";

interface VerificationIssue {
  code: string;
  message: string;
}

async function verify(): Promise<VerificationIssue[]> {
  const issues: VerificationIssue[] = [];
  const storage = getStorage();

  const products = await prisma.product.findMany();
  const photoshoots = await prisma.photoshoot.findMany();
  const jobs = await prisma.generationJob.findMany();
  const images = await prisma.generationImage.findMany();
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = new Set(users.map((u) => u.id));
  const productIds = new Set(products.map((p) => p.id));
  const jobIds = new Set(jobs.map((j) => j.id));

  for (const product of products) {
    if (!userIds.has(product.userId)) {
      issues.push({
        code: "product_missing_user",
        message: `Product ${product.id} references missing user ${product.userId}`,
      });
    }
    if (product.originalImageKey) {
      const exists = await storage.exists(product.originalImageKey);
      if (!exists) {
        issues.push({
          code: "product_missing_storage",
          message: `Product ${product.id} storage key missing: ${product.originalImageKey}`,
        });
      }
    }
  }

  for (const shoot of photoshoots) {
    if (!userIds.has(shoot.userId)) {
      issues.push({
        code: "photoshoot_missing_user",
        message: `Photoshoot ${shoot.id} references missing user ${shoot.userId}`,
      });
    }
    if (!productIds.has(shoot.productId)) {
      issues.push({
        code: "photoshoot_missing_product",
        message: `Photoshoot ${shoot.id} references missing product ${shoot.productId}`,
      });
    }
  }

  for (const job of jobs) {
    if (!userIds.has(job.userId)) {
      issues.push({
        code: "job_missing_user",
        message: `Generation job ${job.id} references missing user ${job.userId}`,
      });
    }
    const shoot = photoshoots.find((s) => s.id === job.photoshootId);
    if (!shoot) {
      issues.push({
        code: "job_missing_photoshoot",
        message: `Generation job ${job.id} references missing photoshoot ${job.photoshootId}`,
      });
    }
  }

  for (const image of images) {
    if (!jobIds.has(image.generationJobId)) {
      issues.push({
        code: "image_missing_job",
        message: `Generation image ${image.id} references missing job ${image.generationJobId}`,
      });
    }
    if (image.storageKey && image.status === "completed") {
      const exists = await storage.exists(image.storageKey);
      if (!exists) {
        issues.push({
          code: "image_missing_storage",
          message: `Generation image ${image.id} storage key missing: ${image.storageKey}`,
        });
      }
    }
  }

  return issues;
}

verify()
  .then((issues) => {
    console.info(`[verify-production-data] Issues found: ${issues.length}`);
    for (const issue of issues) {
      console.error(`  [${issue.code}] ${issue.message}`);
    }
    process.exit(issues.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("[verify-production-data] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL?.trim()) {
      await prisma.$disconnect();
    }
  });
