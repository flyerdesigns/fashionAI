# Production Checklist

## Before Deploy

- [ ] `DATABASE_PROVIDER=postgres`
- [ ] `STORAGE_PROVIDER=s3`
- [ ] `AUTH_SECRET` set (32+ random bytes)
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] S3 bucket is **private** (no public ACL)
- [ ] `GEMINI_API_KEY` configured
- [ ] Stripe live/test keys configured
- [ ] Stripe webhook secret configured
- [ ] Stripe Price IDs configured
- [ ] `APP_URL` set to production domain
- [ ] `RATE_LIMIT_PROVIDER=redis` + `REDIS_URL` (multi-instance)
- [ ] Migrations applied (`npx prisma migrate deploy`)
- [ ] `VERIFY_PRODUCTION=true npm run verify:production` passes (0 FAIL)
- [ ] `npm run test` passes (CI with PostgreSQL — not skipped)
- [ ] `npm run build` passes
- [ ] At least one admin user promoted (`UPDATE "User" SET role = 'admin' WHERE email = '...'`)

## Testing (Step 15)

- [ ] `npm run test:e2e` passes against staging
- [ ] `npm run staging:smoke` passes
- [ ] 24h soak completed on staging (`docs/SOAK_TESTING.md`)
- [ ] Real S3/Stripe/Gemini staging tests documented (`docs/STAGING_PROVIDER_TESTING.md`)

## Account Suspension (Step 14)

- [ ] Migration `20260320100000_user_account_status` applied
- [ ] Admin can suspend/unsuspend from `/admin/users/[id]`
- [ ] Suspended user redirected to `/account-suspended`
- [ ] Suspended user cannot call generation/credits APIs (403)
- [ ] Admin cannot suspend own account

## Admin Panel (Step 11)

- [ ] Admin user promoted in PostgreSQL
- [ ] `/admin` accessible only to admin role
- [ ] Normal user receives 403 on `/api/admin/*`
- [ ] Credit grant/deduct/refund creates ledger + audit entries
- [ ] `npm run verify:credits` passes after admin credit tests

## Processes

- [ ] Web server running
- [ ] Image worker running (`npm run worker:image`)
- [ ] Video worker running (`npm run worker:video`)
- [ ] Cron: credit reservation recovery

## Post-Deploy Smoke Test

- [ ] Login / signup
- [ ] Create product
- [ ] Create photoshoot + generate images
- [ ] Credits deducted correctly
- [ ] Create video + worker processes job
- [ ] Billing checkout (Stripe test mode)
- [ ] Webhook receives `invoice.paid`
- [ ] Health endpoints return ok

## Monitoring

- [ ] Log aggregation configured
- [ ] Sentry configured (`SENTRY_DSN`, `SENTRY_ENVIRONMENT`) — optional
- [ ] Alert on health `/ready` failures
- [ ] Alert on worker process death
- [ ] Monitor Stripe webhook failures
- [ ] `npm run test:integration` passes in CI against PostgreSQL service

## Step 13 (E2E, Security & Production Readiness)

- [ ] `npm run test:integration` passes with `DATABASE_URL_TEST`
- [ ] `npm run test:security` passes
- [ ] `npm run test:smoke` passes
- [ ] Image + video E2E tests pass in CI (mocked providers)
- [ ] Credit recovery script tested (`npm run recover:credit-reservations -- --dry-run`)
- [ ] `npm run workers:health` monitored in production
- [ ] Metrics abstraction covers generation/video/workers (see `lib/metrics`)
- [ ] Structured log events cover critical flows (see `lib/logging/events.ts`)

## Backup

- [ ] PostgreSQL automated backups enabled
- [ ] S3 versioning or lifecycle policy documented
- [ ] Recovery procedure documented
