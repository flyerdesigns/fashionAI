# Step 18 — Staging Infrastructure Provisioning & Final Certification

Step 18 provisions (or connects to) real staging infrastructure and runs the complete certification path from Steps 15–17.

---

## 1. Probe Infrastructure

```bash
npm run probe:infrastructure
```

Exit code 1 means PostgreSQL/Redis are not reachable — do not proceed with database-dependent tests until resolved.

---

## 2. Configure Staging Environment

```bash
cp .env.staging.example .env.staging
```

Fill in **staging/test credentials only**. Never commit `.env.staging`.

Load order: `.env` → `.env.staging` → `.env.local`

Validate:

```bash
STAGING_VALIDATE_PRODUCTION=true npm run validate:staging:env
```

Target: 0 MISSING, 0 INVALID for required production-like variables.

---

## 3. Start Local Stack (if Docker available)

```bash
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml ps
npm run probe:infrastructure   # PostgreSQL + Redis should be AVAILABLE
```

---

## 4. Database & Redis

```bash
npx prisma migrate deploy
npm run validate:database
```

Verify Redis:

```bash
redis-cli -h localhost ping   # PONG
```

---

## 5. Run Full Certification

```bash
npm run certify:staging
STAGING_CERT_STRICT=true npm run certify:staging
```

Or step-by-step — see `docs/STEP_17.md`.

---

## 6. GitHub Actions Path (No Local Docker)

When local Docker/PostgreSQL/Redis are unavailable, use CI:

### Repository secrets (Settings → Secrets and variables → Actions)

| Secret | Required for |
|--------|--------------|
| `STAGING_AWS_ACCESS_KEY_ID` | Real S3 validation |
| `STAGING_AWS_SECRET_ACCESS_KEY` | Real S3 validation |
| `STAGING_AWS_S3_BUCKET` | Real S3 validation |
| `STAGING_AWS_REGION` | Optional (default us-east-1) |
| `STAGING_STRIPE_SECRET_KEY` | Stripe TEST (`sk_test_*`) |
| `STAGING_STRIPE_WEBHOOK_SECRET` | Stripe webhook validation |
| `STAGING_STRIPE_*_PRICE_ID` | Optional billing E2E |
| `STAGING_GEMINI_API_KEY` | Real generation validation |

### Run workflow

1. Push code to GitHub
2. **Actions → Staging Certification → Run workflow**
3. Set `run_soak=true` only after all other checks pass (blocks ~24h)

Workflow file: `.github/workflows/staging-certification.yml`

CI provides PostgreSQL 16 + Redis 7 automatically. Provider steps report **BLOCKED** when secrets are missing — never fake PASS.

---

## 7. Provider Validation (Real Credentials Required)

```bash
STORAGE_PROVIDER=s3 STAGING_ENV=staging npm run verify:staging:storage
npm run verify:staging:stripe
npm run verify:staging:generation
```

Start workers:

```bash
npm run worker:image    # terminal 1
npm run worker:video    # terminal 2
npm run workers:health
```

---

## 8. Soak & Final Verification

Only after all individual checks pass:

```bash
SOAK_DURATION_HOURS=24 STAGING_BASE_URL=https://your-staging-url npm run soak:test
```

Post-soak:

```bash
npm run staging:smoke
npm run test:e2e
npm run test:integration
npm run test:security
VERIFY_PRODUCTION=true VERIFY_RUN_TESTS=true npm run verify:production
```

---

## GO Criteria

See `docs/GO_LIVE_CHECKLIST.md` and `docs/STEP_18_FINAL_REPORT.md`.

**GO** requires: all tests executed (0 skipped Playwright), real provider validation, workers processing jobs, 24h soak complete, `verify:production` → 0 FAIL.

**NO-GO** if any required check is BLOCKED, FAIL, or skipped due to missing config when infrastructure was available.

---

## Related

- `docs/STAGING.md` — architecture
- `docs/E2E_TESTING.md` — Playwright
- `docs/STAGING_PROVIDER_TESTING.md` — S3/Stripe/Gemini
- `docs/SOAK_TESTING.md` — soak configuration
