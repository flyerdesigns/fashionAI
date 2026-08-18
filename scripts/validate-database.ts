/**
 * Database validation for staging/production readiness.
 *
 * Usage:
 *   DATABASE_URL=... DATABASE_PROVIDER=postgres tsx scripts/validate-database.ts
 */
import { PrismaClient } from "../lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { isPostgresEnabled } from "../lib/db/config";

type Result = "PASS" | "WARN" | "FAIL" | "SKIP";

function log(result: Result, name: string, detail?: string) {
  console.log(`[${result}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("Atelier AI — Database Validation\n");

  if (!isPostgresEnabled()) {
    log("SKIP", "PostgreSQL", "DATABASE_PROVIDER is not postgres");
    process.exit(0);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    log("FAIL", "DATABASE_URL", "MISSING");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await prisma.$queryRaw`SELECT 1`;
    log("PASS", "Connection");

    const pending = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL
    `;
    if (pending.length > 0) {
      log("FAIL", "Migrations", `${pending.length} pending`);
      process.exit(1);
    }
    log("PASS", "Migrations applied");

    const statusColumn = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'status'
    `;
    if (statusColumn.length === 0) {
      log("FAIL", "User.status column", "MISSING — run prisma migrate deploy");
      process.exit(1);
    }
    log("PASS", "User.status column");

    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'User' AND indexname LIKE '%status%'
    `;
    log(indexes.length > 0 ? "PASS" : "WARN", "User.status index");

    const tables = [
      "User",
      "Product",
      "Photoshoot",
      "GenerationJob",
      "VideoGenerationJob",
      "CreditAccount",
      "Subscription",
      "AuditLog",
      "WorkerHeartbeat",
    ] as const;

    for (const table of tables) {
      const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
      );
      log("PASS", `Table ${table}`, `rows=${count[0]?.count?.toString() ?? "0"}`);
    }

    const suspended = await prisma.user.count({ where: { status: "suspended" } });
    log("PASS", "Suspension support", `${suspended} suspended user(s)`);

    log("PASS", "Schema validation complete");
  } catch (error) {
    log("FAIL", "Database validation", error instanceof Error ? error.message : "unknown error");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
