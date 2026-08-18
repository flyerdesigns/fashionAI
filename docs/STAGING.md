# Staging Environment

Staging mirrors production architecture with test-mode credentials.

## Architecture

| Process | Command |
|---------|---------|
| Web | `npm run build && npm start` |
| Image worker | `npm run worker:image` |
| Video worker | `npm run worker:video` |

## Required Configuration

```env
NODE_ENV=production
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://...
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=your-staging-bucket
AUTH_SECRET=...
APP_URL=https://staging.example.com
GEMINI_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_*_PRICE_ID=price_...
RATE_LIMIT_PROVIDER=redis
REDIS_URL=redis://...
```

## Test Accounts

Seed dedicated accounts (never shared with production):

```bash
PLAYWRIGHT_TEST_EMAIL=staging-user@example.com
PLAYWRIGHT_TEST_PASSWORD=...
PLAYWRIGHT_ADMIN_TEST_EMAIL=staging-admin@example.com
PLAYWRIGHT_ADMIN_TEST_PASSWORD=...
PLAYWRIGHT_SUSPENDED_TEST_EMAIL=staging-suspended@example.com
PLAYWRIGHT_SUSPENDED_TEST_PASSWORD=...
PLAYWRIGHT_SEED=true npm run seed:playwright
```

Or promote admin via `ADMIN_EMAILS` on signup.

## Verification Sequence

1. `npx prisma migrate deploy`
2. `STAGING_VALIDATE_PRODUCTION=true npm run validate:staging:env` → 0 MISSING
3. `npm run validate:database` → PASS
4. `VERIFY_PRODUCTION=true npm run verify:production` → 0 FAIL
5. `STAGING_BASE_URL=... npm run staging:smoke`
6. Start workers → `npm run workers:health`
7. `npm run verify:staging:storage` (real S3)
8. `npm run verify:staging:stripe` (test mode)
9. `npm run test:e2e` against staging URL
10. Optional: `SOAK_DURATION_HOURS=24 npm run soak:test`

Or run the full Step 17/18 orchestrator:

```bash
npm run probe:infrastructure          # check Docker/Postgres/Redis first
cp .env.staging.example .env.staging    # configure staging secrets locally
npm run certify:staging
```

For CI-based certification (no local Docker): see `.github/workflows/staging-certification.yml` and `docs/STEP_19.md`.

Workflow jobs:

| Job | Secrets required |
|-----|------------------|
| `certify-core` | None — Postgres, Redis, all tests, E2E |
| `certify-providers` | `STAGING_AWS_*`, `STAGING_STRIPE_*`, `STAGING_GEMINI_API_KEY` |
| `certify-soak` | `STAGING_BASE_URL` variable + `run_soak=true` |

## S3 Staging Bucket

- Use a **dedicated staging bucket** or prefix: `staging/{STAGING_ENV}/`
- Bucket must remain **private**
- Cleanup: `verify-staging-storage.ts` deletes its own test object

## Stripe Test Mode

```bash
stripe listen --forward-to https://staging.example.com/api/stripe/webhook
stripe trigger invoice.paid
```

Credits are granted **only** from `invoice.paid`, never from checkout redirect.

## Rollback

1. Revert web/worker deployment to previous image
2. Do not roll back additive DB migrations — use forward fixes
3. Stripe: revert webhook endpoint if misconfigured
4. S3: no rollback needed (objects remain)

See `docs/GO_LIVE_CHECKLIST.md` for production promotion.
