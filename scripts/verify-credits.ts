/**
 * Verify credit ledger consistency.
 *
 * Usage:
 *   npm run verify:credits
 *   npm run verify:credits -- --repair
 */
import { verifyCreditConsistency, repairStaleReservedStatuses } from "../lib/credits/reconciliation";
import { formatValidationReport } from "../lib/env/validate";

async function main() {
  const repair = process.argv.includes("--repair");

  console.log("Credit consistency verification\n");

  const report = await verifyCreditConsistency();

  console.log(`Accounts checked: ${report.accountsChecked}`);
  console.log(`Reservations checked: ${report.reservationsChecked}`);
  console.log(`Issues found: ${report.issues.length}\n`);

  if (report.issues.length === 0) {
    console.log("No inconsistencies detected.");
    process.exit(0);
  }

  for (const issue of report.issues) {
    console.log(
      `[${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}${
        issue.userId ? ` (user: ${issue.userId})` : ""
      }`,
    );
  }

  if (repair) {
    const repaired = await repairStaleReservedStatuses(false);
    console.log(`\nRepaired ${repaired} stale reservation status(es).`);
    console.log("Re-run verify:credits to confirm.");
  } else {
    console.log("\nRun with --repair to fix safe stale reservation statuses only.");
  }

  const hasErrors = report.issues.some((issue) => issue.severity === "error");
  process.exit(hasErrors ? 1 : 0);
}

main().catch((error) => {
  console.error(formatValidationReport([]));
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
