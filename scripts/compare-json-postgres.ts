/**
 * Compare JSON repository counts with PostgreSQL for migration validation.
 *
 * Usage:
 *   npx tsx scripts/compare-json-postgres.ts
 */
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/db/client";

const DATA_DIR = path.join(process.cwd(), ".data");

async function readJsonCount(fileName: string): Promise<number> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), "utf-8");
    return (JSON.parse(raw) as unknown[]).length;
  } catch {
    return 0;
  }
}

async function compare() {
  const [jsonUsers, jsonProducts, jsonPhotoshoots, jsonJobs] = await Promise.all([
    readJsonCount("users.json"),
    readJsonCount("products.json"),
    readJsonCount("photoshoots.json"),
    readJsonCount("generation-jobs.json"),
  ]);

  const [pgUsers, pgProducts, pgPhotoshoots, pgJobs, pgImages] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.photoshoot.count(),
    prisma.generationJob.count(),
    prisma.generationImage.count(),
  ]);

  console.info("[compare-json-postgres] Count comparison:");
  console.info(`  users:        json=${jsonUsers} postgres=${pgUsers}`);
  console.info(`  products:     json=${jsonProducts} postgres=${pgProducts}`);
  console.info(`  photoshoots:  json=${jsonPhotoshoots} postgres=${pgPhotoshoots}`);
  console.info(`  jobs:         json=${jsonJobs} postgres=${pgJobs}`);
  console.info(`  images:       postgres=${pgImages} (derived from job records in JSON)`);
}

compare()
  .catch((error) => {
    console.error("[compare-json-postgres] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL?.trim()) {
      await prisma.$disconnect();
    }
  });
