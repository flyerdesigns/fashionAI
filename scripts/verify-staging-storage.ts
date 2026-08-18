/**
 * Staging S3 verification — real bucket only when credentials are configured.
 *
 * Usage:
 *   STORAGE_PROVIDER=s3 STAGING_ENV=staging tsx scripts/verify-staging-storage.ts
 */
import { randomUUID } from "crypto";
import { getStorage } from "../lib/storage";
import { isS3Enabled } from "../lib/db/config";
import { canUserAccessAsset } from "../lib/assets/authorization";

type Result = "PASS" | "WARN" | "FAIL" | "SKIP";

function log(result: Result, name: string, detail?: string) {
  console.log(`[${result}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("Atelier AI — Staging Storage Verification\n");

  if (!isS3Enabled()) {
    log("SKIP", "S3 storage", "STORAGE_PROVIDER is not s3 or AWS_S3_BUCKET missing");
    process.exit(0);
  }

  const stagingEnv = process.env.STAGING_ENV?.trim() || "staging";
  const testUserId = process.env.STAGING_TEST_USER_ID?.trim() || "00000000-0000-4000-8000-000000000001";
  const runId = randomUUID().slice(0, 8);
  const key = `users/${testUserId}/staging/${stagingEnv}/verify-${runId}/test-object.bin`;
  const payload = Buffer.from(`staging-storage-verify-${Date.now()}`);

  const storage = getStorage();
  let uploaded = false;

  try {
    await storage.upload(payload, "test-object.bin", {
      key,
      contentType: "application/octet-stream",
    });
    uploaded = true;
    log("PASS", "Upload");

    const exists = await storage.exists(key);
    if (!exists) {
      log("FAIL", "Exists check", "object not found after upload");
      process.exit(1);
    }
    log("PASS", "Exists check");

    const read = await storage.readFile(key);
    if (!read.equals(payload)) {
      log("FAIL", "Read", "content mismatch");
      process.exit(1);
    }
    log("PASS", "Read");

    const owned = await canUserAccessAsset(key, testUserId);
    log(owned ? "PASS" : "FAIL", "Ownership validation", owned ? "owner matches" : "ownership mismatch");
    if (!owned) process.exit(1);

    const signedUrl = await storage.getSignedUrl(key, 60);
    if (!signedUrl.startsWith("http")) {
      log("FAIL", "Signed URL", "invalid URL format");
      process.exit(1);
    }
    log("PASS", "Signed URL generation");

    const download = await fetch(signedUrl);
    if (!download.ok) {
      log("FAIL", "Signed URL download", `HTTP ${download.status}`);
      process.exit(1);
    }
    log("PASS", "Signed URL download");

    await storage.delete(key);
    uploaded = false;
    log("PASS", "Delete / cleanup");
  } catch (error) {
    log("FAIL", "Storage operation", error instanceof Error ? error.message : String(error));
    if (uploaded) {
      try {
        await storage.delete(key);
        log("PASS", "Cleanup after failure");
      } catch {
        log("WARN", "Cleanup after failure", `manual delete may be required: ${key}`);
      }
    }
    process.exit(1);
  }

  console.log("\nStaging storage verification complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
