# Step 14 — Full Codebase Audit

**Date:** 2026-03-20  
**Scope:** Production readiness audit before Step 14 fixes (verified against code, not assumptions)

## Current Architecture

| Layer | Implementation |
|-------|----------------|
| Frontend | Next.js 16 App Router, React 19, Tailwind |
| Auth | Auth.js v5 JWT; credentials + optional Google OAuth |
| Database | PostgreSQL (Prisma 7) with JSON fallback for local dev |
| Storage | S3 (production) / local filesystem (development) |
| Credits | PostgreSQL ledger; atomic reserve/settle/refund |
| Billing | Stripe subscriptions; credits from `invoice.paid` only |
| Image jobs | Polling worker + row-level lock (`lockedAt`/`lockedBy`) |
| Video jobs | Separate polling worker + provider abstraction |
| Admin | Role-based (`user`/`admin`); audit log for sensitive actions |
| Rate limit | Memory (dev) / Redis (production, fail-closed) |
| Observability | Structured logging, metrics, optional Sentry |

See `docs/ARCHITECTURE.md` for pipeline diagrams.

## Production Risks (Pre–Step 14)

### Critical / High

| Risk | Location | Status in Step 14 |
|------|----------|-------------------|
| Video source ownership bypass when only `sourceStorageKey` sent without matching product/photoshoot IDs | `lib/video/service.ts` `validateSourceOwnership` | **Fixed** — always calls `canUserAccessAsset` |
| Nested interactive elements (`<Link><Button>`) causing invalid HTML / hydration warnings | 5 UI files | **Fixed** — use `Button href=` |
| Account suspension deferred since Step 11 | User model | **Implemented** — `User.status`, admin API, middleware |
| `verify:production` used development validation locally | `scripts/verify-production.ts` | **Fixed** — `VERIFY_PRODUCTION=true` + PASS/WARN/FAIL |

### Medium

| Risk | Notes |
|------|-------|
| JWT session lacks live status until DB refresh | Mitigated: JWT callback refreshes `status` from DB on each token use |
| Stripe Price IDs not in required production env list | Added as **warnings** in `validateEnvironment` |
| CI did not run production verification | Added CI step with production-like env |
| Dashboard may issue multiple repository queries | Existing indexes adequate; no N+1 migration required |
| Dead mock file `lib/mock/dashboard.ts` (847 credits) | Unused; dashboard reads real DB — safe to remove later |

### Low

| Risk | Notes |
|------|-------|
| Sentry optional in production | Documented as WARN in verify script |
| Worker heartbeats absent until workers start | WARN in verify script |
| Google OAuth hidden when not configured | Correct behavior |

## Incomplete Features (Before Step 14)

- **Account suspension** — intentionally deferred Step 11 → implemented Step 14
- **Full E2E browser tests** — integration/API tests cover flows; no Playwright/Cypress
- **Real S3/Stripe/Gemini in CI** — mocked at provider boundaries (by design)

## Security Risks

| Area | Finding |
|------|---------|
| IDOR | Product/photoshoot/video APIs scope by session userId — tested in `tests/security/regression.test.ts` |
| Video storage key | Gap when attacker sends victim's key — **fixed + regression test** |
| Credit manipulation | userId from session only; concurrent 100-credit test added |
| Admin bypass | Middleware + `requireAdminApi` double-check |
| Stripe webhook | Signature validation + idempotency (Step 12/13) |
| Asset signed URLs | Ownership via `canUserAccessAsset` |
| Secrets in client | `validateEnvironment` rejects `NEXT_PUBLIC_*` secret keys |

## Performance Risks

| Area | Finding |
|------|---------|
| Indexes | User email/role; Product userId+createdAt; Photoshoot userId; GenerationJob status+lockedAt; VideoJob status+lockedAt; AuditLog indexed — **adequate** |
| `User.status` index | **Added** in Step 14 migration |
| Large video delivery | Videos served via signed S3 URLs, not through Next.js body proxy |
| Client bundles | No unnecessary rewrites planned; server components used on data pages |

## Testing Gaps (Pre–Step 14)

| Area | Coverage |
|------|----------|
| Auth HTTP | Step 13 `auth-http.test.ts` |
| Generation/Video E2E | Step 13 integration tests |
| Credits concurrency | Step 13 + Step 14 100-credit test |
| Security regression | 4 cases → expanded with video IDOR |
| Account suspension | **Added** Step 14 |
| Redis rate limit fail-closed | Unit + integration (Step 13) |
| Browser hydration | Manual; Link/Button fixes applied |

**Note:** Integration/security tests require `DATABASE_URL_TEST` (PostgreSQL). Without it, tests skip — never reported as pass.

## Deployment Risks

| Risk | Mitigation |
|------|------------|
| Missing AUTH_SECRET | Production env validation fails |
| JSON DB / local storage in production | `validateEnvironment` errors |
| Redis unavailable with `RATE_LIMIT_PROVIDER=redis` | Middleware returns 503 (fail-closed) |
| Workers not running | Jobs queue; heartbeats WARN in verify |
| Migration for `User.status` | Safe additive migration with default `active` |

## Step 14 Implementation Summary

See `docs/STEP_14.md` and `docs/FINAL_PRODUCTION_AUDIT.md` for fixes applied and validation results.
