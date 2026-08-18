/**
 * Seed dedicated Playwright test accounts in PostgreSQL.
 *
 * Usage:
 *   PLAYWRIGHT_SEED=true tsx scripts/seed-playwright-users.ts
 *
 * Requires DATABASE_URL and PLAYWRIGHT_* credential env vars.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  status: "active" | "suspended";
}

function requiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function buildSeedUsers(): SeedUser[] {
  const users: SeedUser[] = [];

  const testEmail = requiredEnv("PLAYWRIGHT_TEST_EMAIL");
  const testPassword = requiredEnv("PLAYWRIGHT_TEST_PASSWORD");
  if (testEmail && testPassword) {
    users.push({
      email: testEmail,
      name: "Playwright Test User",
      password: testPassword,
      role: "user",
      status: "active",
    });
  }

  const adminEmail = requiredEnv("PLAYWRIGHT_ADMIN_TEST_EMAIL");
  const adminPassword = requiredEnv("PLAYWRIGHT_ADMIN_TEST_PASSWORD");
  if (adminEmail && adminPassword) {
    users.push({
      email: adminEmail,
      name: "Playwright Admin User",
      password: adminPassword,
      role: "admin",
      status: "active",
    });
  }

  const suspendedEmail = requiredEnv("PLAYWRIGHT_SUSPENDED_TEST_EMAIL");
  const suspendedPassword = requiredEnv("PLAYWRIGHT_SUSPENDED_TEST_PASSWORD");
  if (suspendedEmail && suspendedPassword) {
    users.push({
      email: suspendedEmail,
      name: "Playwright Suspended User",
      password: suspendedPassword,
      role: "user",
      status: "suspended",
    });
  }

  return users;
}

async function main() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  if (!databaseUrl) {
    console.log("SKIP — DATABASE_URL not configured");
    process.exit(0);
  }

  const users = buildSeedUsers();
  if (users.length === 0) {
    console.log("SKIP — no PLAYWRIGHT_* test credentials configured");
    process.exit(0);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    for (const seed of users) {
      const email = seed.email.toLowerCase();
      const passwordHash = await bcrypt.hash(seed.password, 12);
      const existing = await prisma.user.findUnique({ where: { email } });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: seed.name,
            passwordHash,
            role: seed.role,
            status: seed.status,
            provider: "credentials",
          },
        });
        console.log(`Updated Playwright user: ${email} (${seed.role}, ${seed.status})`);
        await prisma.creditAccount.upsert({
          where: { userId: existing.id },
          create: { userId: existing.id, balance: 100, reserved: 0 },
          update: {},
        });
      } else {
        const created = await prisma.user.create({
          data: {
            email,
            name: seed.name,
            passwordHash,
            role: seed.role,
            status: seed.status,
            provider: "credentials",
          },
        });
        await prisma.creditAccount.upsert({
          where: { userId: created.id },
          create: { userId: created.id, balance: 100, reserved: 0 },
          update: {},
        });
        console.log(`Created Playwright user: ${email} (${seed.role}, ${seed.status})`);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
