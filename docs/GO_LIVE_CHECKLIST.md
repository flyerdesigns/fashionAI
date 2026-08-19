# Go-Live Checklist

Complete before production deployment. All items must be verified in **staging** first.

## Security

- [ ] Authentication verified (Playwright `01-auth.spec.ts`)
- [ ] Authorization verified (integration + security tests)
- [ ] IDOR tests pass (`npm run test:security`)
- [ ] Admin protection verified (`06-admin.spec.ts`)
- [ ] Account suspension verified (`07-suspension.spec.ts`)
- [ ] Secrets absent from logs (audit sanitizer tests)
- [ ] Rate limiting enabled (`RATE_LIMIT_PROVIDER=redis` multi-instance)
- [ ] Redis configured for production

## Database

- [ ] PostgreSQL production configured (`DATABASE_PROVIDER=postgres`)
- [ ] Migrations applied (`npx prisma migrate deploy`)
- [ ] Backup strategy verified
- [ ] Credit reconciliation verified (`npm run verify:credits`)

## Storage

- [ ] S3 configured (`STORAGE_PROVIDER=s3`)
- [ ] Private bucket (no public ACL)
- [ ] Signed URLs tested (`npm run verify:staging:storage`)
- [ ] Ownership validation tested
- [ ] Cleanup process documented

## AI

- [ ] Gemini credentials configured
- [ ] Image generation tested (one controlled job + worker)
- [ ] Video generation tested (one 5s job if required)
- [ ] Credit settlement verified
- [ ] Failure/refund verified (integration tests)

## Stripe

- [ ] Production keys configured (`sk_live_*` only in production secrets)
- [ ] Production Price IDs configured
- [ ] Webhook endpoint configured
- [ ] Webhook signature verified
- [ ] `invoice.paid` tested (not checkout redirect)
- [ ] Idempotency tested (duplicate webhook)
- [ ] Customer portal tested

## Workers

- [ ] Image worker running (`npm run worker:image`)
- [ ] Video worker running (`npm run worker:video`)
- [ ] Heartbeats fresh (`npm run workers:health`)
- [ ] Recovery script scheduled (`npm run recover:credit-reservations`)

## Observability

- [ ] Sentry configured (if required)
- [ ] Logs aggregated
- [ ] Health checks monitored (`/api/health/live`, `/api/health/ready`)
- [ ] Alerts configured for 503/unavailable

## Testing

- [ ] `npm run validate:staging:env` — 0 MISSING (production mode)
- [ ] `npm run validate:database` — PASS
- [ ] `npm run lint` pass
- [ ] `npm run test:unit` pass
- [ ] `npm run test:integration` pass (PostgreSQL)
- [ ] `npm run test:security` pass
- [ ] `npm run test:smoke` pass
- [ ] `npm run test:e2e` pass (**0 skipped**)
- [ ] `SOAK_DURATION_HOURS=24 npm run soak:test` completed
- [ ] `VERIFY_PRODUCTION=true npm run verify:production` → **0 FAIL**
- [ ] Staging soak completed (`SOAK_DURATION_HOURS=24 npm run soak:test`)

## Deployment

- [ ] `npm run build` pass
- [ ] Rollback procedure documented (`docs/STAGING.md`)
- [ ] GO/NO-GO decision recorded (`docs/STEP_17_FINAL_REPORT.md`)

## Step 20 — Publish & Execute GitHub Certification

Repository connected and pushed:

- **GitHub:** https://github.com/flyerdesigns/fashionAI
- **CI #11:** PASS on `43a1d0b` (full green)

Configure secrets and dispatch workflow (see `docs/STEP_28.md`, `docs/STEP_29.md`):

- [x] GitHub repository URL provided and remote configured
- [x] Code pushed to GitHub
- [x] CI green on `main` (CI #11 on `43a1d0b`)
- [x] GitHub CLI installed (`gh` 2.97.0)
- [x] GitHub CLI authenticated (`gh auth login`)
- [x] Staging Certification dispatched (`run_soak=false`) — run [32249216663](https://github.com/flyerdesigns/fashionAI/actions/runs/32249216663)
- [x] `certify-core` job PASS (run [32249216663](https://github.com/flyerdesigns/fashionAI/actions/runs/32249216663))
- [ ] Real staging infrastructure provisioned — see `docs/STEP_30.md`
- [ ] `STAGING_*` secrets configured
- [ ] Staging application deployed (web + image worker + video worker)
- [ ] `STAGING_BASE_URL` variable set (HTTPS)
- [ ] `certify-providers` job PASS
- [ ] 24h soak completed
- [ ] `FINAL DECISION: GO` in certification summary

## GO / NO-GO Criteria

**GO** when:
- All security/database/storage/stripe/worker checks complete
- 0 FAIL in production verification
- Playwright E2E pass against staging
- 24h soak completed without critical failures

**NO-GO** when:
- Any FAIL in `verify:production`
- Worker heartbeats stale
- Unresolved IDOR or credit safety issues
