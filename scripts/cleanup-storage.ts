/**
 * Storage verification and cleanup.
 *
 * Usage:
 *   npm run verify:storage
 *   npm run cleanup:storage -- --dry-run
 *   npm run cleanup:storage -- --execute
 */
import {
  findOrphanedStorageKeys,
  listKnownOrphansFromDatabase,
  deleteStorageKeys,
} from "../lib/storage/reconciliation";

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = process.argv.includes("--dry-run") || !execute;
  const verifyOnly = process.argv.includes("--verify") || (!execute && !dryRun);

  if (verifyOnly && !process.argv.includes("--dry-run") && !process.argv.includes("--execute")) {
    const dbOrphans = await listKnownOrphansFromDatabase();
    console.log(`Storage verification: ${dbOrphans.length} issue(s) found`);
    for (const orphan of dbOrphans) {
      console.log(`  [${orphan.reason}] ${orphan.storageKey}`);
    }
    process.exit(dbOrphans.length > 0 ? 1 : 0);
  }

  const candidateArg = process.argv.find((arg) => arg.startsWith("--keys="));
  const candidateKeys = candidateArg
    ? candidateArg.replace("--keys=", "").split(",").map((key) => key.trim()).filter(Boolean)
    : [];

  const orphans =
    candidateKeys.length > 0
      ? await findOrphanedStorageKeys(candidateKeys)
      : await listKnownOrphansFromDatabase();

  console.log(`Found ${orphans.length} orphaned/missing storage reference(s)`);
  for (const orphan of orphans) {
    console.log(`  [${orphan.reason}] ${orphan.storageKey}`);
  }

  if (dryRun) {
    console.log("\nDry run — no deletions performed. Pass --execute to delete orphaned keys.");
    process.exit(0);
  }

  const deleted = await deleteStorageKeys(orphans.map((orphan) => orphan.storageKey));
  console.log(`\nDeleted ${deleted} storage object(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
