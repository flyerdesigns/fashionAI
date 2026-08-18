# Staging Provider Testing

Real external provider tests run **only in staging** with explicit credentials. CI never calls paid APIs.

## S3

```bash
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=staging-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
STAGING_ENV=staging
npm run verify:staging:storage
```

Verifies: upload → exists → read → signed URL → download → delete.

**SKIPPED** when `STORAGE_PROVIDER` is not `s3`.

## Stripe (Test Mode Only)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STAGING_TEST_USER_ID=<uuid>
npm run verify:staging:stripe
```

Refuses `sk_live_*` keys.

### Webhook Manual Test

```bash
stripe listen --forward-to $APP_URL/api/stripe/webhook
stripe trigger invoice.paid
# Replay same event — credits must NOT duplicate (StripeEvent table)
```

### Customer Portal

Authenticated user: `POST /api/billing/portal`

## Gemini Image Generation

1. Set `GEMINI_API_KEY`
2. Start `npm run worker:image`
3. Run one photoshoot via UI or integration test
4. Verify credit reservation → settlement

```bash
npm run verify:staging:generation
```

## Gemini Veo Video

```bash
VERIFY_STAGING_VIDEO=true VIDEO_PROVIDER_API_KEY=... npm run verify:staging:generation
npm run worker:video
```

Run **one** 5-second video only. Expected cost: `CREDITS_VIDEO_5_SEC` (default 25).

## Cost Control

- Do not run bulk generation in staging scripts
- Soak test disables AI by default (`SOAK_RUN_GENERATION_CHECK=false`)
