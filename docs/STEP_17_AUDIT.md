# Step 17 — Pre-Execution Audit

**Date:** 2026-08-18  
**Baseline:** Steps 1–16 complete (tooling ready; staging execution blocked)

## Objective

Execute the full staging validation path against production-like infrastructure and produce an honest GO/NO-GO certification.

## Existing Tooling (No Duplication Required)

| Capability | Script / Location | Step |
|------------|-------------------|------|
| Staging env validation | `npm run validate:staging:env` | 16 |
| Database validation | `npm run validate:database` | 16 |
| Integration tests | `npm run test:integration` | 14 |
| Security tests | `npm run test:security` | 14 |
| Playwright E2E (8 specs) | `npm run test:e2e` | 15 |
| Playwright seed | `npm run seed:playwright` | 15 |
| S3 lifecycle | `npm run verify:staging:storage` | 15 |
| Stripe test mode | `npm run verify:staging:stripe` | 15 |
| Generation pipeline | `npm run verify:staging:generation` | 15 |
| Staging smoke | `npm run staging:smoke` | 15 |
| 24h soak | `npm run soak:test` | 15 |
| Production verify | `npm run verify:production` | 14–16 |
| Worker health | `npm run workers:health` | 14 |
| Local stack | `docker-compose.staging.yml` | 16 |
| **Certification orchestrator** | `npm run certify:staging` | **17 (new)** |

## Local Execution Environment (This Session)

| Resource | Status |
|----------|--------|
| Docker | **Not installed** |
| PostgreSQL (local) | **Not available** |
| Redis (local) | **Not available** |
| `.env.local` | `AUTH_SECRET`, `AUTH_URL` only |
| S3 credentials | **Not configured** |
| Stripe test keys | **Not configured** |
| Gemini / Veo keys | **Not configured** |
| Playwright test users | **Not configured** |
| App on `:3000` | Running (dev/json mode) |
| GitHub CLI (`gh`) | Not installed |

## Architecture (Unchanged)

PostgreSQL, S3, BullMQ/Redis workers, Stripe test/live, Gemini/Veo, Auth.js JWT, account suspension, credit ledger, IDOR checks — all preserved from Steps 1–16.

## Step 17 Additions

1. `scripts/run-staging-certification.ts` — orchestrates validation; reports BLOCKED honestly
2. `npm run certify:staging` — single entry point for certification run
3. Documentation: `STEP_17_AUDIT.md`, `STEP_17.md`, `STEP_17_FINAL_REPORT.md`
4. Updated `GO_LIVE_CHECKLIST.md`

## CI as Authoritative Path

When local infrastructure is unavailable, **GitHub Actions CI** (`.github/workflows/ci.yml`) is the authoritative path for:

- PostgreSQL 16 + Redis 7 service containers
- `prisma migrate deploy`
- Integration + security tests
- Full Playwright E2E with seeded users
- Production verification (config mode with CI env vars)

Local Step 17 execution requires equivalent infrastructure — see `docs/STEP_17.md`.

## Security Review (Static — No Runtime Postgres)

Code paths reviewed (unchanged from Step 16):

- `requireApiUser` / `requireUser` on protected APIs
- `canUserAccessAsset` for storage/generation ownership
- Suspended user middleware + billing recovery exception
- Stripe webhook signature validation (`lib/billing/webhook.ts`)
- Log sanitizer unit tests pass
- No new critical/high findings from static review

Runtime security tests (IDOR, suspension API) remain **BLOCKED** without PostgreSQL.

## Middleware Deprecation

Next.js 16 `middleware.ts` → `proxy` advisory remains **non-blocking technical debt** — no safe migration without architectural disruption.

## Conclusion

Step 17 **cannot complete GO certification locally** without Docker/Postgres/Redis and staging provider credentials. Tooling is ready; execution is infrastructure-blocked.
