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

## Step 19 — GitHub Actions Certification

Push to GitHub and dispatch the workflow (see `docs/STEP_19.md`):

1. Configure repository secrets: `STAGING_AWS_*`, `STAGING_STRIPE_*`, `STAGING_GEMINI_API_KEY`
2. Configure variable: `STAGING_BASE_URL` (deployed staging HTTPS URL)
3. **Actions → Staging Certification → Run workflow**
4. First run: `run_soak=false` — target `certify-core` PASS
5. With secrets: target `certify-providers` PASS
6. Final GO: `run_soak=true` after all providers pass

- [ ] Repository pushed to GitHub
- [ ] `certify-core` job PASS (integration 0 skip, Playwright 0 skip)
- [ ] Provider secrets configured
- [ ] `certify-providers` job PASS
- [ ] `STAGING_BASE_URL` variable set
- [ ] 24h soak completed (`run_soak=true`)
- [ ] Post-soak E2E PASS
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
