/**
 * Migration helper for adding userId to existing JSON records.
 *
 * Usage:
 *   npx tsx scripts/migrate-auth-data.ts --report
 *   npx tsx scripts/migrate-auth-data.ts --assign-user=<userId>
 *
 * This script NEVER deletes data. It only reports orphaned records or assigns
 * them to a specified development user when explicitly requested.
 */
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

interface MigrationReport {
  productsWithoutUser: number;
  photoshootsWithoutUser: number;
  jobsWithoutUser: number;
}

async function readJson<T>(fileName: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeJson<T>(fileName: string, data: T[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, fileName), JSON.stringify(data, null, 2), "utf-8");
}

async function report(): Promise<MigrationReport> {
  const products = await readJson<{ userId?: string }>("products.json");
  const photoshoots = await readJson<{ userId?: string }>("photoshoots.json");
  const jobs = await readJson<{ userId?: string }>("generation-jobs.json");

  const result = {
    productsWithoutUser: products.filter((p) => !p.userId).length,
    photoshootsWithoutUser: photoshoots.filter((p) => !p.userId).length,
    jobsWithoutUser: jobs.filter((j) => !j.userId).length,
  };

  console.info("[migrate-auth-data] Records missing userId:");
  console.info(`  products: ${result.productsWithoutUser}`);
  console.info(`  photoshoots: ${result.photoshootsWithoutUser}`);
  console.info(`  generation jobs: ${result.jobsWithoutUser}`);

  return result;
}

async function assignUser(userId: string) {
  const products = await readJson<Record<string, unknown>>("products.json");
  const photoshoots = await readJson<Record<string, unknown>>("photoshoots.json");
  const jobs = await readJson<Record<string, unknown>>("generation-jobs.json");

  let updated = 0;

  for (const product of products) {
    if (!product.userId) {
      product.userId = userId;
      updated += 1;
    }
  }

  for (const photoshoot of photoshoots) {
    if (!photoshoot.userId) {
      photoshoot.userId = userId;
      updated += 1;
    }
  }

  for (const job of jobs) {
    if (!job.userId) {
      job.userId = userId;
      updated += 1;
    }
  }

  await writeJson("products.json", products);
  await writeJson("photoshoots.json", photoshoots);
  await writeJson("generation-jobs.json", jobs);

  console.info(`[migrate-auth-data] Assigned userId=${userId} to ${updated} records.`);
}

async function main() {
  const args = process.argv.slice(2);
  const assignArg = args.find((arg) => arg.startsWith("--assign-user="));

  if (assignArg) {
    const userId = assignArg.replace("--assign-user=", "").trim();
    if (!userId) {
      console.error("Provide a valid user id: --assign-user=<userId>");
      process.exit(1);
    }
    await assignUser(userId);
    await report();
    return;
  }

  await report();
}

void main();
