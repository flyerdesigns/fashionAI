# Step 10 — Production Hardening Audit

**Project:** Atelier AI (`/Users/zeel/FahionAI`)  
**Date:** 2026-03-18  
**Scope:** Steps 1–9 complete. This audit covers the current state before Step 10 implementation.  
**Status:** Phase 1 audit complete. Step 10 core hardening implemented (see `STEP_10_PRODUCTION_HARDENING.md`).

---

## Executive Summary

Atelier AI is a Next.js 16 SaaS with Auth.js (JWT), dual persistence (JSON dev / PostgreSQL prod), dual storage (local / S3), Gemini image generation, Gemini Veo video generation, Stripe subscriptions, and a credit metering system. The domain architecture is solid and follows consistent patterns (services → repositories → PostgreSQL).

**Production readiness: partial.** Core business flows work, but Step 10 gaps are significant:

| Area | Status |
|------|--------|
| Automated testing | ❌ None (no Vitest/Jest, zero test files) |
| Job queue | ⚠️ DB polling only (no Redis/BullMQ) |
| Health / monitoring | ⚠️ Static `/api/health` only |
| Admin panel | ❌ Not implemented |
| Rate limiting | ❌ Not implemented |
| Request ID tracing | ❌ Not implemented (job idempotency only) |
| Audit logging | ❌ Not implemented |
| Worker observability | ⚠️ Console logs only, no heartbeat |
| Security headers | ❌ Not configured |
| Environment validation | ⚠️ Ad-hoc per module, no centralized fail-fast |
| Credit reconciliation | ⚠️ Recovery script exists, no reconcile tooling |
| Storage cleanup | ⚠️ Partial (no video keys, no CLI script) |

---

## 1. Existing Architecture

### 1.1 Request Flow

```
Browser
  ↓
middleware.ts (JWT session check)
  ↓
Next.js API route (requireApiUser)
  ↓
Domain service (lib/*/service.ts)
  ↓
Repository factory (JSON | PostgreSQL)
  ↓
PostgreSQL (Prisma) / .data/*.json
```

### 1.2 Generation Flow

```
POST /api/generate/*
  ↓
GenerationService / VideoService
  ↓
Credit check + reserve (PostgreSQL only)
  ↓
Job record (GenerationJob | VideoGenerationJob)
  ↓
Worker poll loop (scripts/*-worker.ts)
  ↓
Provider factory (Gemini | Gemini Veo)
  ↓
Storage upload (local | S3)
  ↓
Credit settle / release
```

### 1.3 Directory Inventory

| Path | Purpose |
|------|---------|
| `app/(app)/` | Authenticated UI (dashboard, create, products, photoshoots, videos, credits, settings) |
| `app/(auth)/` | Login, signup |
| `app/api/` | 26 API route handlers |
| `lib/auth/` | Session helpers, server actions |
| `lib/billing/` | Stripe checkout, portal, webhooks |
| `lib/credits/` | Credit accounts, reservations, settlement |
| `lib/generation/` | Image job service, worker, repository |
| `lib/video/` | Video job service, worker, Veo provider |
| `lib/storage/` | Local + S3 abstraction |
| `lib/db/` | Prisma client, mappers, config |
| `lib/ai/` | Gemini image provider, prompt builder |
| `lib/products/` | Product CRUD |
| `lib/photoshoot/` | Photoshoot CRUD |
| `lib/assets/` | Storage ownership authorization |
| `lib/mock/` | Preset constants (used in production UI — naming is misleading) |
| `components/` | 53 React components |
| `types/` | Domain TypeScript types |
| `prisma/` | Schema + 3 migrations |
| `scripts/` | Workers + migration/recovery scripts |
| `docs/` | Steps 6–9 documentation (5 files) |

### 1.4 Repository Factory Pattern

All domains switch on `isPostgresEnabled()` (`lib/db/config.ts`):

| Domain | JSON | PostgreSQL | Notes |
|--------|------|------------|-------|
| Users | ✅ | ✅ | |
| Products | ✅ | ✅ | |
| Photoshoots | ✅ | ✅ | |
| Generation jobs | ✅ | ✅ | JSON locking is unsafe for multi-worker |
| Video | ❌ throws | ✅ | Postgres required |
| Credits | N/A | ✅ only | No-op in JSON mode |
| Billing | N/A | ✅ only | |

---

## 2. Database (Prisma)

### 2.1 Models

| Model | Key fields | Indexes |
|-------|-----------|---------|
| `User` | id, email, passwordHash, provider | email |
| `Product` | userId, originalImageKey | userId, userId+createdAt, originalImageKey |
| `Photoshoot` | userId, productId, configuration (JSON) | userId, userId+createdAt, productId |
| `GenerationJob` | status, requestId (unique), lockedAt/lockedBy | userId, photoshootId, status, status+lockedAt |
| `GenerationImage` | generationJobId, storageKey, status | generationJobId, photoshootId, storageKey |
| `Video` | userId, storageKey, status, configuration (JSON) | userId, userId+createdAt, userId+status |
| `VideoGenerationJob` | videoId, requestId (unique), lockedAt/lockedBy | status, status+lockedAt |
| `CreditAccount` | balance, reserved, lifetime* | userId (unique) |
| `CreditTransaction` | type, amount, referenceType+referenceId | userId+createdAt, type |
| `CreditReservation` | generationJobId OR videoGenerationJobId | status, createdAt |
| `UsageRecord` | operation, credits, videoId | userId+createdAt, operation |
| `StripeCustomer` | stripeCustomerId (unique) | stripeCustomerId |
| `Subscription` | stripeSubscriptionId, plan, status | userId, status |
| `StripeEvent` | stripeEventId (unique), processed | type, processed |

### 2.2 Migrations

| Migration | Path |
|-----------|------|
| Initial (User, Product, Photoshoot, Generation*) | `prisma/migrations/20260318120000_initial/` |
| Billing + credits | `prisma/migrations/20260318180000_billing_credits/` |
| Video generation | `prisma/migrations/20260318220000_video_generation/` |

### 2.3 Schema Gaps for Step 10

| Missing model | Step 10 requirement |
|---------------|---------------------|
| `AuditLog` | Admin actions, login, credit adjustments |
| `WorkerHeartbeat` | Worker health monitoring |
| `User.role` | Admin authorization |

**Recommended indexes (justify before adding):**
- `GenerationJob.createdAt` — admin job list sorting (may help; verify query plans)
- `VideoGenerationJob.createdAt` — same
- `AuditLog.userId + createdAt` — admin audit queries (new model)

**Do NOT:** drop tables, reset migrations, or make destructive changes.

---

## 3. Authentication & Authorization

### 3.1 Current Implementation

| File | Role |
|------|------|
| `auth.ts` | NextAuth instance (Google + Credentials) |
| `auth.config.ts` | JWT strategy, session callback |
| `middleware.ts` | Route protection |
| `lib/auth/service.ts` | `requireUser`, `requireApiUser` |
| `lib/auth/actions.ts` | Signup, login, logout server actions |

**Session:** JWT (no server-side session store). User ID from token only — never from request body. ✅

**Password:** bcrypt via `bcryptjs`. Password hash never exposed to client. ✅

### 3.2 Middleware Coverage

**Protected UI prefixes:** `/dashboard`, `/create`, `/products`, `/photoshoots`, `/generation`, `/videos`, `/templates`, `/credits`, `/settings`

**Gap:** `/video-generation/[jobId]` is **NOT** in `PROTECTED_PREFIXES` or `matcher`. Unauthenticated users can load the page shell (API calls still 401).

**Public API:** `/api/auth/*`, `/api/health`, `/api/stripe/webhook`

**All other `/api/*`:** Middleware requires session + routes call `requireApiUser()`. Defense in depth. ✅

### 3.3 Roles / Admin

- Prisma `User` has **no role field**
- App `User.plan` is a billing tier (Stripe-derived), not authorization
- No `/admin` routes or components exist
- Docs (`AUTHENTICATION.md`) explicitly defer roles

**Recommendation:** Add `role: user | admin` to User model OR env-based admin email allowlist for initial rollout.

---

## 4. Credits & Billing

### 4.1 Credit System (`lib/credits/`)

**Lifecycle:** reserve → settle (consume + refund partial) / release (cancel/fail)

**Amount convention:** Positive = grants/refunds; negative = reservations on ledger.

**PostgreSQL-only:** JSON mode skips all credit operations silently.

**Key files:**
- `service.ts` — atomic reserve via `updateMany WHERE balance >= credits`
- `config.ts` — `CREDITS_PER_IMAGE`, `CREDITS_VIDEO_*_SEC`
- `types.ts` — transaction types, settlement inputs

### 4.2 Billing (`lib/billing/`)

- Checkout: `POST /api/billing/checkout` (plan id only — backend resolves Stripe price) ✅
- Portal: `POST /api/billing/portal`
- Webhook: `POST /api/stripe/webhook` (signature verified, `StripeEvent` idempotency) ✅
- Authoritative credit grant: `invoice.paid` with `subscription:{id}:{periodStart}` reference ✅

### 4.3 Existing Scripts

| Script | Purpose |
|--------|---------|
| `scripts/recover-credit-reservations.ts` | Release stale `reserved` reservations |
| `scripts/migrate-credit-accounts.ts` | Backfill credit accounts for existing users |

### 4.4 Billing Gaps

| Gap | Risk |
|-----|------|
| No scheduled cron for reservation recovery | Credits stuck in `reserved` after worker crash |
| No reconciliation tooling | Silent ledger drift undetected |
| No admin credit adjustment API | Manual DB edits bypass audit |
| No webhook failure alerting | Missed subscription credits |
| No duplicate-request guard beyond `requestId` | Client can omit requestId and create duplicate jobs |

---

## 5. Storage

### 5.1 Implementation

| File | Role |
|------|------|
| `lib/storage/index.ts` | Factory: `STORAGE_PROVIDER=local\|s3` |
| `lib/storage/s3.ts` | AWS SDK v3 |
| `lib/storage/local.ts` | `.data/uploads/` |
| `lib/storage/keys.ts` | Key builders, user ID parser |
| `lib/storage/cleanup.ts` | Orphan detection (partial) |
| `lib/assets/authorization.ts` | Ownership before serving |

**Key patterns:**
```
users/{userId}/products/{productId}/original/{file}
users/{userId}/photoshoots/{photoshootId}/generated/{imageId}.png
users/{userId}/videos/{videoId}/video.mp4
users/{userId}/videos/{videoId}/thumbnail.jpg
```

### 5.2 Asset Delivery

`GET /api/assets/[...path]`:
- Requires auth ✅
- Blocks `..` paths ✅
- Checks ownership ✅
- **Reads entire file into memory** ⚠️ — problematic for large MP4s
- `getSignedUrl()` exists on storage interface but is **unused**

### 5.3 Storage Gaps

| Gap | Recommendation |
|-----|----------------|
| `cleanup.ts` ignores Video keys | Extend to `Video.storageKey`, `thumbnailStorageKey`, `sourceStorageKey` |
| No `cleanup:assets` CLI | Add `--dry-run` / `--execute` script |
| No upload size/MIME validation at storage layer | Add in upload paths |
| No failed-generation cleanup | Worker should delete partial uploads on failure |
| Full-file buffering for video | Use S3 presigned URLs for video delivery |

---

## 6. Image Generation

### 6.1 Stack

| Layer | Path |
|-------|------|
| Service | `lib/generation/service.ts` |
| Worker | `lib/generation/worker.ts` |
| Image unit | `lib/generation/image-generator.ts` |
| Provider | `lib/ai/providers/gemini-image.ts` |
| Credits | `lib/generation/credits-integration.ts` |
| Config | `lib/generation/config.ts` |
| Logger | `lib/generation/logger.ts` (console.*) |

### 6.2 Worker (`scripts/generation-worker.ts`)

- Poll interval: `GENERATION_WORKER_POLL_MS` (default 2s)
- Claim: PostgreSQL transactional lock (`lockedAt`/`lockedBy`, stale 10 min)
- In-memory `processingJobs` Set — single-process dedup only
- **No SIGTERM graceful shutdown**
- **`GENERATION_MAX_CONCURRENCY` is defined but never used**

### 6.3 Reliability

| Feature | Status |
|---------|--------|
| Per-image retry (worker loop) | ✅ Sequential retry on next worker pass |
| Exponential backoff | ❌ Fixed poll interval only |
| Error categorization | ✅ `lib/generation/errors.ts` |
| Rate limit detection | ⚠️ String matching in Gemini error mapper |
| Job idempotency | ✅ `requestId` unique column |
| Partial failure settlement | ✅ consume completed + release failed |

---

## 7. Video Generation

### 7.1 Stack

| Layer | Path |
|-------|------|
| Service | `lib/video/service.ts` |
| Worker | `lib/video/worker.ts` |
| Provider | `lib/video/providers/gemini-veo.ts` |
| Credits | `lib/video/credits-integration.ts` |

### 7.2 Worker (`scripts/video-worker.ts`)

- Poll interval: `VIDEO_WORKER_POLL_MS` (default 3s)
- Stale lock: 15 min
- Retries: up to `VIDEO_MAX_ATTEMPTS` (default 2), requeues to `queued`
- Postgres required — JSON mode throws

### 7.3 Gaps

Same as image worker: no queue, no heartbeat, no graceful shutdown, no dead-letter queue.

---

## 8. API Routes (Complete)

| Route | Auth | Ownership check |
|-------|------|-----------------|
| `GET /api/health` | Public | N/A |
| `GET/POST /api/auth/[...nextauth]` | Public | N/A |
| `POST /api/stripe/webhook` | Stripe signature | N/A |
| `GET/POST /api/products` | Session | userId from session |
| `GET/PATCH/DELETE /api/products/[id]` | Session | `findForUser` |
| `GET /api/photoshoots` | Session | userId filter |
| `GET /api/photoshoots/[id]` | Session | `findByIdForUser` |
| `POST /api/photoshoots/[id]/retry-failed` | Session | ownership |
| `POST /api/generate/photoshoot` | Session | product ownership |
| `POST /api/generate/regenerate` | Session | photoshoot ownership |
| `GET /api/generation/[jobId]` | Session | job.userId |
| `POST /api/generation/[jobId]/cancel` | Session | job.userId |
| `POST /api/generation/[jobId]/retry-failed` | Session | job.userId |
| `POST /api/generate/video` | Session | source ownership |
| `GET/DELETE /api/video/[id]` | Session | video.userId |
| `GET /api/videos` | Session | userId filter |
| `GET/POST /api/video/jobs/[jobId]/*` | Session | job.userId |
| `GET /api/credits` | Session | own balance |
| `GET /api/credits/transactions` | Session | own ledger |
| `GET /api/credits/usage` | Session | own usage |
| `POST /api/billing/checkout` | Session | own customer |
| `GET /api/billing/subscription` | Session | own subscription |
| `POST /api/billing/portal` | Session | own customer |
| `GET /api/assets/[...path]` | Session | `canUserAccessAsset` |

---

## 9. Testing

### 9.1 Current State

- **No test framework** in `package.json`
- **Zero test files** in repository
- No CI pipeline configuration found
- No `tests/` directory

### 9.2 Recommended Test Structure (Step 10)

```
tests/
  unit/           — prompt builder, credit math, error mappers, env validation
  integration/    — credit reserve/settle with test DB
  api/            — route handlers with mocked auth
  workers/        — job claiming, settlement (mocked providers)
  billing/        — webhook idempotency, invoice credit grant
  credits/        — concurrency, partial failure, refund
  auth/           — ownership, unauthorized access
```

**Framework:** Vitest (no Jest/Playwright currently; add Testing Library only if UI unit tests are warranted).

**Mock targets:** Gemini, Gemini Veo, Stripe, S3 — no real external calls.

---

## 10. Security Audit

| Control | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ | Auth.js JWT, middleware |
| Authorization / ownership | ✅ | `findByIdForUser` pattern |
| IDOR prevention | ✅ | 404 on cross-user access |
| CSRF | ⚠️ | Next.js defaults; no explicit config |
| XSS | ⚠️ | React escaping; no CSP |
| SQL injection | ✅ | Prisma parameterized queries |
| Path traversal | ✅ | `..` blocked in assets route |
| File upload attacks | ⚠️ | Product upload exists; size/MIME limits unclear |
| SSRF | ✅ | No user-controlled outbound URLs |
| Rate limiting | ❌ | Not implemented |
| Brute force (login) | ❌ | Not implemented |
| Request size limits | ⚠️ | Next.js defaults only |
| Secrets in client | ✅ | Server-only env vars |
| Stripe webhook verification | ✅ | Raw body + signature |
| Security headers | ❌ | `next.config.ts` is empty |
| Admin authorization | ❌ | No admin system |
| Password hash exposure | ✅ | Never returned to client |
| `/video-generation` route gap | ❌ | Missing from middleware |

---

## 11. Monitoring & Health

### 11.1 Current Health Endpoint

`GET /api/health` returns static JSON:

```json
{
  "status": "ok",
  "message": "Foundation API ready. AI services not connected yet."
}
```

**Does not check:** database, storage, Redis, workers, Gemini, Stripe.

### 11.2 Logging

| Logger | Format |
|--------|--------|
| `lib/generation/logger.ts` | `[generation] message {json}` |
| `lib/video/logger.ts` | `[video] message {json}` |
| API routes | Ad-hoc `console.error` |
| Workers | Raw console |

**Missing:** request IDs, structured JSON logging, log levels, correlation across API → worker.

### 11.3 Worker Observability

- No heartbeat table or Redis key
- No `workers:health` script
- No metrics (queue depth, failure rate, latency)

---

## 12. Environment Variables

Current `.env.example` covers Steps 1–9. **Missing for Step 10:**

| Variable | Purpose |
|----------|---------|
| `QUEUE_PROVIDER` | `local` \| `bullmq` |
| `REDIS_URL` | BullMQ + rate limit (prod) |
| `QUEUE_PREFIX` | Queue namespace |
| `RATE_LIMIT_PROVIDER` | `memory` \| `redis` |
| `LOG_LEVEL` | Structured logging |
| `ADMIN_EMAILS` | Bootstrap admin allowlist (optional) |
| `NODE_ENV` | Production validation gate |
| `AI_RETRY_*` | Exponential backoff config |

---

## 13. Existing Documentation

| Doc | Accurate? | Gaps |
|-----|-----------|------|
| `AUTHENTICATION.md` | Partial | Still emphasizes JSON users; no roles |
| `PRODUCTION_INFRASTRUCTURE.md` | Partial | Missing video/billing models |
| `GENERATION_WORKER.md` | ✅ | |
| `BILLING_AND_CREDITS.md` | ✅ | |
| `VIDEO_GENERATION.md` | ✅ | |
| `README.md` | ❌ | Default create-next-app boilerplate |

---

## 14. Production Readiness Matrix

| Requirement | Pass | Partial | Fail |
|-------------|------|---------|------|
| Auth + ownership | ✅ | | |
| PostgreSQL + Prisma | ✅ | | |
| S3 private storage | | ✅ | (no presigned URLs) |
| Credit reservation atomicity | ✅ | | |
| Stripe webhook idempotency | ✅ | | |
| Image generation E2E | ✅ | | |
| Video generation E2E | ✅ | | |
| Automated tests | | | ❌ |
| Durable job queue | | | ❌ |
| Rate limiting | | | ❌ |
| Health/readiness probes | | | ❌ |
| Admin panel | | | ❌ |
| Audit logging | | | ❌ |
| Worker heartbeat | | | ❌ |
| Graceful worker shutdown | | | ❌ |
| Credit reconciliation | | ✅ | |
| Storage orphan cleanup | | ✅ | |
| Security headers | | | ❌ |
| Request ID tracing | | | ❌ |
| Env validation (fail-fast) | | ✅ | |
| Production runbook | | | ❌ |

---

## 15. Recommended Changes (Step 10 Plan)

### Phase 2 — Testing Infrastructure

**Create:**
- `vitest.config.ts`
- `tests/` directory structure
- Test helpers: mock Prisma, mock storage, mock Gemini/Stripe
- Scripts: `test`, `test:watch`, `test:coverage`

**Modify:**
- `package.json` — add Vitest devDependencies + scripts

**Priority tests:** credit reservation concurrency, webhook idempotency, job idempotency, ownership checks.

---

### Phase 3 — Queue Abstraction & Worker Hardening

**Create:**
- `lib/queue/types.ts` — QueueProvider interface
- `lib/queue/local-queue.ts` — wraps existing poll (dev default)
- `lib/queue/bullmq-queue.ts` — Redis/BullMQ (prod optional)
- `lib/queue/index.ts` — factory on `QUEUE_PROVIDER`

**Modify:**
- `scripts/generation-worker.ts` — SIGTERM drain, rename alias `worker:image`
- `scripts/video-worker.ts` — graceful shutdown
- `lib/generation/worker.ts` — exponential retry helper
- `lib/video/worker.ts` — same
- `lib/generation/config.ts` — use or remove `GENERATION_MAX_CONCURRENCY`

**Do NOT remove** existing poll-based local worker.

---

### Phase 4 — Monitoring & Health

**Create:**
- `GET /api/health/live` — liveness (process up)
- `GET /api/health/ready` — DB + storage + queue checks
- `lib/health/checks.ts`
- `lib/logging/` — structured logger with requestId
- Middleware or API wrapper for `X-Request-ID`

**Modify:**
- `app/api/health/route.ts` — delegate to health service
- `middleware.ts` — propagate/generate request ID

---

### Phase 5 — Security Hardening

**Create:**
- `lib/rate-limit/` — memory (dev) + redis (prod) abstraction
- Rate limit on: login, signup, generate, video, billing checkout

**Modify:**
- `middleware.ts` — add `/video-generation` to protected routes
- `next.config.ts` — security headers (HSTS, X-Frame-Options, etc.)

**Do NOT rate-limit** `/api/stripe/webhook`.

---

### Phase 6 — Billing & Credit Reconciliation

**Create:**
- `scripts/reconcile-credits.ts` — `--dry-run` / `--execute`
- `lib/credits/reconciliation.ts`
- `lib/credits/admin-adjustment.ts` — audited manual grants

**Modify:**
- `lib/credits/service.ts` — expose admin-safe adjustment (admin only)

---

### Phase 7 — Admin Panel

**Schema migration (non-destructive):**
- Add `User.role` (`user` | `admin`) — default `user`
- Add `AuditLog` model

**Create:**
- `lib/admin/` — service, authorization (`requireAdmin`)
- `app/(app)/admin/` — dashboard + sub-pages
- `app/api/admin/` — paginated APIs

**Pages:** users, products, photoshoots, generations, videos, jobs, billing, credits, storage, system health.

**Authorization:** Server-side only — check `User.role === 'admin'` or env allowlist.

---

### Phase 8 — Audit Logging

**Create:**
- `lib/audit/service.ts`
- Hook into: login, signup, generation create/complete/fail, video events, credit adjustments, admin actions

**Rule:** Metadata must never contain secrets.

---

### Phase 9 — Production Verification

**Create:**
- `scripts/verify-production.ts` (extend `verify-production-data.ts`)
- `scripts/cleanup-assets.ts` — `--dry-run` / `--execute`
- `scripts/workers-health.ts`
- `lib/env/validate.ts` — centralized env validation

**Modify:**
- `.env.example` — Step 10 variables with comments
- `docs/STEP_10_PRODUCTION_HARDENING.md`

---

### Phase 10 — Validation

Run:
```bash
npm run lint
npm run test
npm run build
npx prisma validate
npx prisma generate
npx prisma migrate status
```

---

## 16. Files Expected to Be Created (Step 10)

```
docs/STEP_10_PRODUCTION_HARDENING.md
vitest.config.ts
tests/**/*
lib/queue/**
lib/health/**
lib/logging/**
lib/rate-limit/**
lib/env/validate.ts
lib/audit/**
lib/admin/**
lib/credits/reconciliation.ts
lib/credits/admin-adjustment.ts
scripts/reconcile-credits.ts
scripts/cleanup-assets.ts
scripts/workers-health.ts
scripts/verify-production.ts
app/api/health/live/route.ts
app/api/health/ready/route.ts
app/(app)/admin/**
app/api/admin/**
prisma/migrations/*_step10_*/  (User.role, AuditLog, WorkerHeartbeat)
```

---

## 17. Files Expected to Be Modified (Step 10)

```
package.json
.env.example
middleware.ts
next.config.ts
auth.ts / lib/auth/service.ts (admin helper)
prisma/schema.prisma
lib/credits/service.ts
lib/storage/cleanup.ts
lib/generation/worker.ts
lib/generation/config.ts
lib/video/worker.ts
scripts/generation-worker.ts
scripts/video-worker.ts
app/api/health/route.ts
README.md (optional — production overview)
```

---

## 18. Files That Must NOT Be Changed Unnecessarily

```
lib/ai/providers/gemini-image.ts     — working provider
lib/billing/service.ts               — working Stripe integration (extend only)
lib/generation/service.ts            — working job creation (extend only)
lib/video/service.ts                 — working video creation (extend only)
auth.config.ts                       — working JWT strategy
prisma/migrations/20260318*          — existing migrations (never edit)
```

---

## 19. Deployment Topology (Recommended Production)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js    │     │  Redis       │     │ PostgreSQL  │
│  (web)      │────▶│  (queue +    │     │             │
│             │     │   rate limit)│     │             │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Image    │ │ Video    │ │ Cron     │
        │ Worker   │ │ Worker   │ │ (credit  │
        │          │ │          │ │ recovery)│
        └────┬─────┘ └────┬─────┘ └──────────┘
             │            │
             ▼            ▼
        ┌─────────────────────┐
        │  AWS S3 (private)   │
        └─────────────────────┘
             │
             ▼
        ┌─────────────────────┐
        │  Gemini / Veo API   │
        └─────────────────────┘
```

**Local development:** Single machine, `QUEUE_PROVIDER=local`, `RATE_LIMIT_PROVIDER=memory`, JSON/postgres optional, workers as separate terminals.

---

## 20. Open Decisions (Resolve Before Implementation)

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Admin role storage | DB `User.role` vs env allowlist | DB role + seed first admin via migration/script |
| Queue in dev | Keep poll-only vs optional Redis | `QUEUE_PROVIDER=local` default (poll) |
| Video delivery | Presigned URL vs streaming proxy | Presigned URL for S3; proxy for local |
| Test database | SQLite vs dedicated PostgreSQL test DB | PostgreSQL test container or mocked Prisma |
| Audit log retention | Unlimited vs TTL | Unlimited initially; document archival policy |

---

## 21. Risk Register

| Risk | Likelihood | Impact | Mitigation (Step 10) |
|------|------------|--------|----------------------|
| Worker crash leaves credits reserved | Medium | High | Cron + reconcile script |
| Multiple JSON workers double-process | Low (dev) | Medium | Gate JSON repos to development |
| Large video OOM on assets route | Medium | High | Presigned URLs |
| Stripe webhook missed | Low | High | Monitor unprocessed `StripeEvent` |
| No tests → regression | High | High | Vitest suite |
| Admin panel misconfiguration | Medium | Critical | Server-side role check only |

---

## 22. Conclusion

Steps 1–9 delivered a feature-complete fashion AI SaaS with sound domain patterns. Step 10 should **extend** this foundation — not replace it — focusing on:

1. **Tests** — highest ROI for regression safety
2. **Queue abstraction** — optional BullMQ without breaking local poll
3. **Health + logging + request IDs** — operability
4. **Admin + audit** — support and compliance
5. **Security** — rate limits, middleware fix, headers
6. **Reconciliation + cleanup scripts** — financial and storage integrity

**Next step:** Proceed to Phase 2 (testing infrastructure) upon approval.
