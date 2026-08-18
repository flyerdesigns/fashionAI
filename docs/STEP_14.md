# Step 14 — Final Production Readiness

Step 14 completes production hardening on top of Steps 1–13 without replacing existing architecture.

## What Was Fixed

### Security
- **Video source ownership:** `validateSourceOwnership` now always verifies storage key ownership via `canUserAccessAsset` when product/photoshoot/image IDs do not fully validate the key.
- **Account suspension:** `User.status` (`active` | `suspended`), admin suspend/unsuspend API, JWT/session status refresh, middleware + API blocks, billing portal/subscription allowed for recovery.
- **Security regression test:** Video job creation blocked when using another user's storage key.

### UI / Hydration
- Removed invalid `<Link><Button>` nesting in:
  - `GenerationPreview.tsx`
  - `InsufficientCreditsBanner.tsx`
  - `credits/page.tsx`
  - `settings/page.tsx`
  - `settings/billing/page.tsx`
- (Step 13) `CreateFlowEntry` nested button already fixed.

### Environment & Verification
- `VERIFY_PRODUCTION=true` forces production validation locally.
- `scripts/verify-production.ts` reports **PASS / WARN / FAIL** per subsystem.
- Stripe Price IDs produce warnings when missing in production validation.
- CI runs `verify:production` with production-like configuration.

### Database
- Migration `20260320100000_user_account_status`: adds `User.status` default `active` + index.

### Tests
- Concurrent 100-credit reservation test (exactly one succeeds).
- Account suspension service + API block tests.
- Video storage key IDOR regression test.

## New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/admin/users/[id]/status` | Suspend or unsuspend user (audited) |

## New Pages

| Path | Description |
|------|-------------|
| `/account-suspended` | Shown to suspended users; links to billing + logout |

## Deployment Sequence

1. Apply migration: `npx prisma migrate deploy`
2. Set production env (see `docs/DEPLOYMENT.md`)
3. Run `VERIFY_PRODUCTION=true npm run verify:production` — resolve all FAIL
4. Start app + workers: `npm run worker:image`, `npm run worker:video`
5. Run `npm run workers:health`
6. Smoke test login, generation, billing webhook (staging)

## Rollback

1. Revert application deploy (previous container/image).
2. **Do not** roll back `User.status` migration if users were suspended — column is backward compatible.
3. Workers can be stopped/restarted independently.

## Monitoring

- `/api/health/live` — liveness
- `/api/health/ready` — DB, storage, providers
- Sentry (optional): `SENTRY_DSN`
- Worker heartbeats in `WorkerHeartbeat` table
- Audit log for admin suspend/unsuspend actions

## Remaining Limitations

- No browser E2E (Playwright) — API/integration tests only
- Integration tests require PostgreSQL (`DATABASE_URL_TEST`)
- Real S3/Stripe/Gemini not exercised in CI (mocked)
- `lib/mock/dashboard.ts` still present but unused

See also: `docs/STEP_14_AUDIT.md`, `docs/FINAL_PRODUCTION_AUDIT.md`
