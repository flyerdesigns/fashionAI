# Step 17 — Full Staging Execution & Production Certification

**Goal:** Execute real staging validation and produce an honest GO/NO-GO decision.

Step 16 established **NO-GO** because staging was not executed. Step 17 runs (or blocks) each required check.

---

## Quick Start

### Option A — Local Docker stack

```bash
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml ps   # wait for healthy
```

### Option B — Managed staging (recommended)

Use a dedicated staging deployment with PostgreSQL, Redis, S3 bucket, Stripe **test** keys, and Gemini credentials.

---

## 1. Configure Environment

Copy `.env.example` → `.env.staging` (never commit). Minimum:

```env
NODE_ENV=production
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atelier_ai_test
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/atelier_ai_test
REDIS_URL=redis://localhost:6379
REDIS_URL_TEST=redis://localhost:6379
STORAGE_PROVIDER=s3
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-staging-bucket
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
GEMINI_API_KEY=...
VIDEO_PROVIDER_API_KEY=...
AUTH_SECRET=...   # 32+ chars
APP_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
RATE_LIMIT_PROVIDER=redis
QUEUE_PROVIDER=bullmq
PLAYWRIGHT_TEST_EMAIL=playwright-user@test.local
PLAYWRIGHT_TEST_PASSWORD=...
PLAYWRIGHT_ADMIN_TEST_EMAIL=playwright-admin@test.local
PLAYWRIGHT_ADMIN_TEST_PASSWORD=...
PLAYWRIGHT_SUSPENDED_TEST_EMAIL=playwright-suspended@test.local
PLAYWRIGHT_SUSPENDED_TEST_PASSWORD=...
STAGING_BASE_URL=http://localhost:3000
```

Validate (never prints secrets):

```bash
STAGING_VALIDATE_PRODUCTION=true npm run validate:staging:env
# Target: 0 MISSING, 0 INVALID
```

---

## 2. Database

```bash
npx prisma migrate deploy
npm run validate:database
```

---

## 3. Automated Test Suites

```bash
npm run lint
npm run test:unit          # 44 tests
npm run test:integration   # requires DATABASE_URL_TEST — target 0 skipped
npm run test:security      # requires DATABASE_URL_TEST — target 0 skipped
npm run test:smoke
npm run build
```

---

## 4. Playwright E2E

```bash
PLAYWRIGHT_SEED=true npm run seed:playwright
PLAYWRIGHT_WEBSERVER_CMD="npm run start" npm run test:e2e
```

**Target:** Passed = all, Skipped = 0, Failed = 0

Specs: `01-auth` through `08-health`.

---

## 5. Provider Validation (Real — No Mocks)

```bash
STORAGE_PROVIDER=s3 STAGING_ENV=staging npm run verify:staging:storage
npm run verify:staging:stripe
npm run verify:staging:generation
```

Start workers in separate terminals:

```bash
npm run worker:image
npm run worker:video
npm run workers:health
```

---

## 6. Staging Smoke & Soak

```bash
STAGING_BASE_URL=http://localhost:3000 npm run staging:smoke
# After all individual checks pass:
SOAK_DURATION_HOURS=24 STAGING_BASE_URL=... npm run soak:test
```

Post-soak:

```bash
npm run staging:smoke
npm run test:e2e
npm run test:integration
npm run test:security
```

---

## 7. Production Verification

```bash
VERIFY_PRODUCTION=true VERIFY_RUN_TESTS=true npm run verify:production
```

**Required:** `FAIL = 0`, all sections PASS (REDIS may WARN if single-instance).

---

## 8. One-Command Orchestrator

```bash
npm run certify:staging
STAGING_CERT_STRICT=true npm run certify:staging   # exit 1 on BLOCKED or FAIL
```

Reports PASS / FAIL / BLOCKED for each step. Does not fake provider success.

---

## GO / NO-GO

See `docs/STEP_17_FINAL_REPORT.md` for the latest decision.

**GO** only when every required check passes with 0 skipped E2E tests, 0 verify:production FAIL, and 24h soak completed.

**NO-GO** if any critical check is FAIL, BLOCKED, or skipped when infrastructure was available.

---

## Related Docs

- `docs/STAGING.md` — architecture and rollback
- `docs/E2E_TESTING.md` — Playwright details
- `docs/STAGING_PROVIDER_TESTING.md` — S3/Stripe/Gemini
- `docs/SOAK_TESTING.md` — soak configuration
- `docs/GO_LIVE_CHECKLIST.md` — pre-launch checklist
