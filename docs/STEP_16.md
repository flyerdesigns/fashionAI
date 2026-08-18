# Step 16 — Production Readiness & Go-Live Validation

Step 16 closes the gap between "tooling ready" and "production validated" by adding staging validation scripts, fixing technical debt, and documenting truthful GO/NO-GO criteria.

## What Was Added

### Environment Validation
- `lib/env/staging-status.ts` — CONFIGURED / MISSING / INVALID (never prints secrets)
- `lib/env/load-local-env.ts` — loads `.env.local` for validation scripts
- `npm run validate:staging:env`

### Database Validation
- `npm run validate:database` — connection, migrations, `User.status`, core tables

### Local Staging Stack
- `docker-compose.staging.yml` — optional Postgres 16 + Redis 7

### Production Verification
- Section summary table: `ENVIRONMENT`, `DATABASE`, `STORAGE`, etc.
- Loads `.env.local` automatically
- CI runs with full production-like env + `VERIFY_RUN_TESTS=true`

### Technical Debt
- Removed unused `mockDashboardStats` from `lib/mock/dashboard.ts`
- Fixed unused import in `app/api/health/route.ts`
- Playwright seed ensures credit accounts on user update
- S3 staging verification uses `users/{userId}/` path for ownership PASS

### Tests
- `tests/unit/staging-env.test.ts` — staging env status regression

## Validation Commands

```bash
# 1. Start local staging stack (requires Docker)
docker compose -f docker-compose.staging.yml up -d
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atelier_ai_test
export DATABASE_PROVIDER=postgres
npx prisma migrate deploy

# 2. Configure staging env (see .env.example)
npm run validate:staging:env
STAGING_VALIDATE_PRODUCTION=true npm run validate:staging:env

# 3. Database
npm run validate:database

# 4. Seed E2E users + run Playwright
npm run seed:playwright
npm run build
PLAYWRIGHT_WEBSERVER_CMD="npm run start" npm run test:e2e

# 5. Provider validation (real credentials required)
STORAGE_PROVIDER=s3 npm run verify:staging:storage
npm run verify:staging:stripe

# 6. Workers
npm run worker:image
npm run worker:video
npm run workers:health

# 7. Soak (after individual checks pass)
SOAK_DURATION_HOURS=24 STAGING_BASE_URL=... npm run soak:test

# 8. Production verification (must be 0 FAIL)
VERIFY_PRODUCTION=true npm run verify:production
```

## Middleware Deprecation

Next.js 16 recommends migrating `middleware.ts` to `proxy`. Not migrated in Step 16 — non-blocking advisory only. No functional impact observed.

## GO / NO-GO

See `docs/STEP_16_FINAL_REPORT.md` for the authoritative decision from this validation session.
