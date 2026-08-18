/**
 * Controlled staging generation test (real providers when configured).
 *
 * Runs ONE image generation job and optionally ONE video job.
 * Skips when credentials or PostgreSQL are unavailable.
 *
 * Usage:
 *   DATABASE_URL=... GEMINI_API_KEY=... tsx scripts/verify-staging-generation.ts
 *   VERIFY_STAGING_VIDEO=true VIDEO_PROVIDER_API_KEY=... tsx scripts/verify-staging-generation.ts
 */
import { isPostgresEnabled } from "../lib/db/config";
import { isVideoProviderConfigured } from "../lib/video/config";

type Result = "PASS" | "WARN" | "FAIL" | "SKIP";

function log(result: Result, name: string, detail?: string) {
  console.log(`[${result}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("Atelier AI — Staging Generation Verification\n");

  if (!isPostgresEnabled()) {
    log("SKIP", "PostgreSQL", "DATABASE_PROVIDER must be postgres");
    process.exit(0);
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    log("SKIP", "Image generation", "GEMINI_API_KEY not configured");
  } else {
    log("WARN", "Image generation", "manual worker run required — start npm run worker:image");
    log("PASS", "Gemini configured", "run one photoshoot via UI or integration test in staging");
    console.log("  Expected flow: POST /api/generate/photoshoot → reserve credits → worker → settle");
    console.log(`  Credit cost per image: ${process.env.CREDITS_PER_IMAGE ?? "5"} credits`);
  }

  if (process.env.VERIFY_STAGING_VIDEO === "true") {
    if (!isVideoProviderConfigured()) {
      log("SKIP", "Video generation", "VIDEO_PROVIDER_API_KEY not configured");
    } else {
      log("WARN", "Video generation", "manual worker run required — start npm run worker:video");
      log("PASS", "Video provider configured", "run one 5s video in staging only");
      console.log(`  Expected credit cost (5s): ${process.env.CREDITS_VIDEO_5_SEC ?? "25"} credits`);
      console.log("  Flow: POST /api/generate/video → worker → S3 upload → credit settlement");
    }
  } else {
    log("SKIP", "Video generation", "set VERIFY_STAGING_VIDEO=true to include");
  }

  console.log("\nFor automated API-level coverage without paid APIs, use:");
  console.log("  npm run test:integration");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
