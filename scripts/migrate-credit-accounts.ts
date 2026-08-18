/**
 * Create credit accounts for existing users.
 *
 * Usage:
 *   npx tsx scripts/migrate-credit-accounts.ts --dry-run
 *   npx tsx scripts/migrate-credit-accounts.ts --execute
 *
 * Policy: existing users receive signup bonus only if explicitly enabled via
 * MIGRATE_CREDIT_SIGNUP_BONUS=true (default false).
 */
import { prisma } from "../lib/db/client";
import { createCreditAccountForUser } from "../lib/credits";
import { getSignupBonusCredits } from "../lib/credits/config";
import { creditService } from "../lib/credits/service";

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--execute");
  const grantBonus = process.env.MIGRATE_CREDIT_SIGNUP_BONUS === "true";
  return { dryRun, grantBonus };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required.");
  }

  const { dryRun, grantBonus } = parseArgs();
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const existingAccounts = await prisma.creditAccount.findMany({ select: { userId: true } });
  const existingSet = new Set(existingAccounts.map((a) => a.userId));

  const missing = users.filter((u) => !existingSet.has(u.id));

  console.info("[migrate-credit-accounts] Users:", users.length);
  console.info("[migrate-credit-accounts] Missing credit accounts:", missing.length);
  console.info("[migrate-credit-accounts] Grant signup bonus:", grantBonus);
  console.info("[migrate-credit-accounts] Bonus amount if enabled:", getSignupBonusCredits());

  if (dryRun) {
    console.info("[migrate-credit-accounts] Dry run complete.");
    return;
  }

  for (const user of missing) {
    if (grantBonus) {
      await createCreditAccountForUser(user.id);
    } else {
      await creditService.ensureAccount(user.id, false);
    }
  }

  console.info("[migrate-credit-accounts] Migration complete.");
}

main()
  .catch((error) => {
    console.error("[migrate-credit-accounts] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL?.trim()) {
      await prisma.$disconnect();
    }
  });
