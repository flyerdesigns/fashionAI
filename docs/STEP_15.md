# Step 15 — Staging Soak, Playwright E2E & Go-Live Readiness

Step 15 adds browser-level E2E testing, staging verification tooling, and go-live documentation on top of Steps 1–14.

## What Was Added

### Playwright Browser E2E
- `@playwright/test` + `playwright.config.ts`
- Eight specs in `tests/e2e/` with console/hydration regression guard
- `scripts/seed-playwright-users.ts` for dedicated test accounts
- npm scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:ui`

### Staging Verification Scripts
| Script | Purpose |
|--------|---------|
| `npm run staging:smoke` | HTTP health + env + worker checks |
| `npm run verify:staging:storage` | Real S3 upload/read/signed URL/delete |
| `npm run verify:staging:stripe` | Stripe test mode checkout + webhook docs |
| `npm run verify:staging:generation` | Controlled Gemini/Veo staging guidance |
| `npm run soak:test` | 24h health/worker soak (no continuous AI) |

### Production Verification (Enhanced)
- `verify:production` now reports: ENVIRONMENT, DATABASE, STORAGE, STRIPE, GEMINI, REDIS, WORKERS, HEALTH, BUILD, TESTS
- Migration pending check via `_prisma_migrations`

### CI
- Playwright chromium install + user seed + E2E after build
- No real Gemini/Stripe/S3 in CI (deterministic browser tests only)

### Tests
- `tests/unit/log-sanitizer.test.ts` — audit metadata redaction regression

## Environment Variables

See `.env.example` — Playwright and staging sections.

## Commands

```bash
# Seed test users (PostgreSQL required)
PLAYWRIGHT_SEED=true npm run seed:playwright

# Browser E2E (app must be running or use webServer in config)
npm run test:e2e

# Staging smoke
STAGING_BASE_URL=https://staging.example.com npm run staging:smoke

# Real S3 (staging bucket only)
STORAGE_PROVIDER=s3 STAGING_ENV=staging npm run verify:staging:storage

# Stripe test mode
npm run verify:staging:stripe

# 24h soak
SOAK_DURATION_HOURS=24 SOAK_INTERVAL_SECONDS=60 npm run soak:test
```

## Skipped When Unconfigured

Real provider tests report **SKIPPED** when credentials are missing — never faked.

See: `docs/STAGING.md`, `docs/GO_LIVE_CHECKLIST.md`, `docs/STEP_15_FINAL_REPORT.md`
