/**
 * Recover stale credit reservations.
 *
 * Usage:
 *   npx tsx scripts/recover-credit-reservations.ts --dry-run
 *   npx tsx scripts/recover-credit-reservations.ts --execute
 */
import { creditService } from "../lib/credits/service";
import { getReservationTimeoutMs } from "../lib/credits/config";
import { prisma } from "../lib/db/client";

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--execute");
  return { dryRun };
}

async function main() {
  const { dryRun } = parseArgs();
  const result = await creditService.recoverStaleReservations({
    dryRun,
    olderThanMs: getReservationTimeoutMs(),
  });

  console.info("[recover-credit-reservations] Found:", result.found);
  console.info("[recover-credit-reservations] Recovered:", result.recovered);
}

main()
  .catch((error) => {
    console.error("[recover-credit-reservations] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL?.trim()) {
      await prisma.$disconnect();
    }
  });
