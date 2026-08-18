/**
 * Stripe TEST MODE staging verification.
 *
 * Verifies checkout session creation and documents webhook testing.
 * Does NOT grant credits from checkout — credits come from invoice.paid only.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... tsx scripts/verify-staging-stripe.ts
 *
 * Webhook testing (manual):
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 *   stripe trigger invoice.paid
 */
import { isStripeConfigured } from "../lib/billing/config";
import { getStripe } from "../lib/billing/stripe";
import { getPlan } from "../lib/billing/plans";

type Result = "PASS" | "WARN" | "FAIL" | "SKIP";

function log(result: Result, name: string, detail?: string) {
  console.log(`[${result}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("Atelier AI — Stripe Staging Verification (TEST MODE ONLY)\n");

  if (!isStripeConfigured()) {
    log("SKIP", "Stripe", "STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not configured");
    process.exit(0);
  }

  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  if (secret.startsWith("sk_live")) {
    log("FAIL", "Stripe mode", "Refusing to run against live Stripe keys");
    process.exit(1);
  }

  const stripe = getStripe();
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID?.trim();
  if (!starterPriceId) {
    log("WARN", "STRIPE_STARTER_PRICE_ID", "not configured — checkout test skipped");
  } else {
    try {
      const price = await stripe.prices.retrieve(starterPriceId);
      log(price.active ? "PASS" : "WARN", "Starter price ID", price.id);
    } catch (error) {
      log("FAIL", "Starter price ID", error instanceof Error ? error.message : "invalid");
      process.exit(1);
    }
  }

  const appUrl = process.env.APP_URL?.trim() || "http://localhost:3000";
  const testUserId = process.env.STAGING_TEST_USER_ID?.trim();
  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL?.trim() || "staging-test@example.com";

  if (starterPriceId && testUserId) {
    try {
      const plan = getPlan("starter");
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: testEmail,
        line_items: [{ price: starterPriceId, quantity: 1 }],
        success_url: `${appUrl}/settings/billing?success=true`,
        cancel_url: `${appUrl}/settings/billing?cancelled=true`,
        metadata: { userId: testUserId, planId: plan.id },
        subscription_data: {
          metadata: { userId: testUserId, planId: plan.id },
        },
      });
      if (session.url) {
        log("PASS", "Checkout session created", "session id present (URL not printed)");
      } else {
        log("WARN", "Checkout session", "created without URL");
      }
    } catch (error) {
      log("FAIL", "Checkout session", error instanceof Error ? error.message : "failed");
      process.exit(1);
    }
  } else {
    log("SKIP", "Checkout session", "set STAGING_TEST_USER_ID + STRIPE_STARTER_PRICE_ID");
  }

  console.log("\nWebhook testing commands (run manually in staging):");
  console.log("  stripe listen --forward-to ${APP_URL}/api/stripe/webhook");
  console.log("  stripe trigger invoice.paid");
  console.log("  # Replay same event id — credits must NOT duplicate (StripeEvent idempotency)");

  console.log("\nCustomer portal: POST /api/billing/portal (requires authenticated user session)");

  log("PASS", "Stripe staging verification", "test mode checks complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
