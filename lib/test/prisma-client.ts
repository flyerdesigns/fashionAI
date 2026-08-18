import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let testPool: pg.Pool | null = null;
let testPrisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (testPrisma) return testPrisma;

  const connectionString = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    throw new Error("DATABASE_URL_TEST is required for integration tests.");
  }

  testPool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(testPool);
  testPrisma = new PrismaClient({ adapter });
  return testPrisma;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}
