# Step 36 Audit — Staging Providers + GitHub Certification Configuration

**Date:** 2026-08-20  
**Commit:** `ed14278`  
**Railway project:** `fashionAI-staging` (`9111e522-25bb-4bd4-81f4-2ffbe657d9ff`)  
**Staging URL:** https://fashionai-staging-web-production.up.railway.app

---

## Phase 1 — Railway service status

| Resource | Status |
|----------|--------|
| fashionai-staging-web | **Online** |
| fashionai-staging-image-worker | **Online** |
| fashionai-staging-video-worker | **Online** |
| PostgreSQL | **Online** |
| Redis | **Online** |

## Phase 1 — Required environment variables (PRESENT / MISSING)

### fashionai-staging-web

| Variable | Status |
|----------|--------|
| DATABASE_URL | PRESENT |
| REDIS_URL | PRESENT |
| NODE_ENV=production | PRESENT |
| DATABASE_PROVIDER=postgres | PRESENT |
| STORAGE_PROVIDER=s3 | PRESENT |
| RATE_LIMIT_PROVIDER=redis | PRESENT |
| QUEUE_PROVIDER=bullmq | PRESENT |
| AUTH_URL | PRESENT (staging host) |
| APP_URL | PRESENT (staging host) |
| STAGING_BASE_URL | PRESENT (staging host) |
| AUTH_SECRET | PRESENT |
| PLAYWRIGHT_SEED=true | PRESENT |
| PLAYWRIGHT_TEST_EMAIL | PRESENT |
| PLAYWRIGHT_ADMIN_TEST_EMAIL | PRESENT |
| PLAYWRIGHT_SUSPENDED_TEST_EMAIL | PRESENT |
| PLAYWRIGHT_*_PASSWORD (3) | PRESENT |
| NIXPACKS_NODE_VERSION=22 | PRESENT |
| AWS_* / STRIPE_* / GEMINI_* | MISSING |

### fashionai-staging-image-worker

| Variable | Status |
|----------|--------|
| DATABASE_URL | PRESENT |
| REDIS_URL | PRESENT |
| NODE_ENV=production | PRESENT |
| DATABASE_PROVIDER=postgres | PRESENT |
| STORAGE_PROVIDER=s3 | PRESENT |
| RATE_LIMIT_PROVIDER=redis | PRESENT |
| QUEUE_PROVIDER=bullmq | PRESENT |
| AUTH_SECRET | PRESENT |
| NIXPACKS_NODE_VERSION=22 | PRESENT |
| AUTH_URL / APP_URL | MISSING (not required for workers) |
| PLAYWRIGHT_* | MISSING (web-only seed) |
| AWS_* / STRIPE_* / GEMINI_* | MISSING |

### fashionai-staging-video-worker

Same as image worker.

---

## Phase 2 — Provider credential availability

Audited: shell environment, `.env.local`, `.env.staging`, GitHub repository secrets.

| Credential | Status |
|------------|--------|
| STAGING_AWS_ACCESS_KEY_ID | **MISSING** |
| STAGING_AWS_SECRET_ACCESS_KEY | **MISSING** |
| STAGING_AWS_S3_BUCKET | **MISSING** |
| STAGING_AWS_REGION | **MISSING** |
| STAGING_STRIPE_SECRET_KEY | **MISSING** |
| STAGING_STRIPE_WEBHOOK_SECRET | **MISSING** |
| STAGING_STRIPE_STARTER_PRICE_ID | **MISSING** |
| STAGING_STRIPE_PRO_PRICE_ID | **MISSING** |
| STAGING_STRIPE_BUSINESS_PRICE_ID | **MISSING** (app optional but recommended) |
| STAGING_GEMINI_API_KEY | **MISSING** |

`.env.local` contains only `AUTH_SECRET` and `AUTH_URL` (local dev). No `.env.staging` file.

**Provider configuration STOPPED** — no credentials available to configure Railway or GitHub secrets.

---

## Phase 4 — GitHub (partial)

| Item | Status |
|------|--------|
| STAGING_BASE_URL variable | **CONFIGURED** |
| STAGING_* secrets | **MISSING** (none set) |

---

## Phase 5 — Stripe webhook

Endpoint URL (application route exists):

`https://fashionai-staging-web-production.up.railway.app/api/stripe/webhook`

**Stripe webhook registration requires dashboard/Stripe credentials.** Not verified or configured in this step.

---

## Phase 6–7 — Runtime validation (infrastructure only)

| Check | Result |
|-------|--------|
| GET /api/health/live | **200** `{"status":"ok"}` |
| GET /api/health/ready | **200** — database ok, rateLimit ok; storage/stripe/video not_configured |
| Image worker heartbeat (Railway logs) | **PASS** — `worker.started` generation-worker |
| Video worker heartbeat (Railway logs) | **PASS** — `worker.started` video-worker |
| Prisma migrations (preDeploy logs) | **PASS** — 6 migrations, none pending |
| Playwright seed (preDeploy logs) | **PASS** — 3 users created |
| `npm run staging:smoke` (local, STAGING_BASE_URL set) | **PARTIAL** — HTTP PASS; local env lacks DATABASE_URL/AUTH_SECRET so DB/worker checks WARN/FAIL |

---

## Phase 8 — Staging Certification

**NOT RUN** — required `STAGING_*` provider secrets are missing. Dispatch blocked per step rules.
