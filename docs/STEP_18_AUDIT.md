# Step 18 — Pre-Execution Audit

**Date:** 2026-08-18  
**Objective:** Provision staging infrastructure and execute full production certification

## Infrastructure Probe Results (This Machine)

| Component | Status |
|-----------|--------|
| Docker CLI | UNAVAILABLE (broken symlink — Docker Desktop removed) |
| Docker Compose | UNAVAILABLE |
| psql CLI | UNAVAILABLE |
| redis-cli | UNAVAILABLE |
| GitHub CLI | UNAVAILABLE |
| PostgreSQL :5432 | UNAVAILABLE |
| Redis :6379 | UNAVAILABLE |
| Application :3000 | AVAILABLE (dev instance) |

Command: `npm run probe:infrastructure`

## Step 18 Additions

| Item | Purpose |
|------|---------|
| `npm run probe:infrastructure` | Detect Docker/Postgres/Redis availability |
| `.env.staging.example` | Staging config template (no secrets) |
| `load-local-env.ts` | Loads `.env.staging` before `.env.local` |
| `.github/workflows/staging-certification.yml` | CI workflow_dispatch for full certification |
| Updated `certify:staging` | Runs infrastructure probe first |

## Existing Tooling (Unchanged)

All certification scripts from Steps 15–17 remain the execution path:

- `validate:staging:env`, `validate:database`
- `test:integration`, `test:security`, `test:e2e`
- `verify:staging:storage`, `verify:staging:stripe`, `verify:staging:generation`
- `staging:smoke`, `soak:test`, `verify:production`, `certify:staging`

## Recommended Execution Paths

### Path A — Local Docker (when Docker Desktop installed)

```bash
docker compose -f docker-compose.staging.yml up -d
cp .env.staging.example .env.staging   # fill in secrets locally
npm run probe:infrastructure
npm run certify:staging
```

### Path B — GitHub Actions (when local infra unavailable)

1. Push repository to GitHub
2. Configure repository secrets (see `docs/STEP_18.md`)
3. Run **Actions → Staging Certification → Run workflow**
4. Optional: enable 24h soak via workflow input

### Path C — Managed staging deployment

Dedicated staging URL with Postgres, Redis, S3, Stripe TEST, Gemini, workers.

## What Cannot Be Faked

The following require real infrastructure and credentials:

- Integration tests (57) — PostgreSQL
- Security tests (5) — PostgreSQL
- Playwright auth/admin/suspension (12 tests) — PostgreSQL + seeded users
- S3 lifecycle — real bucket + AWS credentials
- Stripe — `sk_test_*` keys + webhook secret
- Gemini/Veo — real API keys + workers
- 24h soak — deployed staging URL + all prerequisites

## Conclusion

Step 18 **cannot complete GO certification on this machine**. Infrastructure provisioning tooling is in place; execution blocked pending Docker reinstall or GitHub Actions with secrets.
