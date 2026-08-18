/**
 * Staging environment validation — never prints secret values.
 *
 * Usage:
 *   STAGING_VALIDATE_PRODUCTION=true tsx scripts/validate-staging-env.ts
 */
import {
  formatStagingEnvReport,
  getStagingEnvReport,
  stagingEnvHasBlockingIssues,
} from "../lib/env/staging-status";
import { loadLocalEnvFiles } from "../lib/env/load-local-env";

async function main() {
  loadLocalEnvFiles();
  console.log("Atelier AI — Staging Environment Validation\n");

  const production = process.env.STAGING_VALIDATE_PRODUCTION === "true";
  const rows = getStagingEnvReport({ production });

  console.log(formatStagingEnvReport(rows));
  console.log("");

  const missing = rows.filter((r) => r.status === "MISSING").length;
  const invalid = rows.filter((r) => r.status === "INVALID").length;
  const configured = rows.filter((r) => r.status === "CONFIGURED").length;

  console.log(`Summary: CONFIGURED=${configured} MISSING=${missing} INVALID=${invalid}`);

  if (stagingEnvHasBlockingIssues(rows) && production) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
