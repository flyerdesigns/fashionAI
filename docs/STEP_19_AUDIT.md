# Step 19 — Pre-Execution Audit

**Date:** 2026-08-19  
**Objective:** Execute GitHub Actions staging certification and resolve real failures

## GitHub Repository Status

| Check | Status |
|-------|--------|
| Git repo in `/Users/zeel/FahionAI` | **Not initialized** (parent `/Users/zeel` has empty git, no commits) |
| GitHub remote | **Not configured** |
| GitHub CLI (`gh`) | **Not installed** |
| Workflow trigger | **BLOCKED** — cannot dispatch without push to GitHub |

## Step 19 Workflow Changes

Updated `.github/workflows/staging-certification.yml`:

| Change | Reason |
|--------|--------|
| Split `certify-core` / `certify-providers` jobs | Core tests pass without provider secrets; providers require secrets |
| Move `probe:infrastructure` after `npm ci` | Step 18 bug — probe failed before dependencies installed |
| `STORAGE_PROVIDER=local` for core job | Matches `ci.yml`; avoids false FAIL without AWS secrets |
| Provider job runs only when all 3 secret groups configured | Clear BLOCKED vs PASS separation |
| `certification-summary` job | Reports PASS/BLOCKED/NO-GO honestly |
| Playwright artifact upload | Log collection for failures |
| Soak requires `STAGING_BASE_URL` repository variable | Soak must target deployed staging, not localhost |
| Post-soak validation job | Smoke + E2E after 24h soak |

## Required GitHub Secrets (Provider GO)

| Secret | Purpose |
|--------|---------|
| `STAGING_AWS_ACCESS_KEY_ID` | Real S3 upload/download |
| `STAGING_AWS_SECRET_ACCESS_KEY` | Real S3 |
| `STAGING_AWS_S3_BUCKET` | Dedicated staging bucket |
| `STAGING_AWS_REGION` | Optional (default us-east-1) |
| `STAGING_STRIPE_SECRET_KEY` | Stripe TEST (`sk_test_*`) |
| `STAGING_STRIPE_WEBHOOK_SECRET` | Webhook signature validation |
| `STAGING_STRIPE_*_PRICE_ID` | Optional billing E2E |
| `STAGING_GEMINI_API_KEY` | Real generation validation |

## Required GitHub Variable

| Variable | Purpose |
|----------|---------|
| `STAGING_BASE_URL` | HTTPS URL of deployed staging (24h soak + post-soak E2E) |

## Core Certification (No Provider Secrets)

The `certify-core` job provides:

- PostgreSQL 16 + Redis 7 services
- Migrations + database validation
- Unit, integration (57), security (5) tests
- Build + Playwright E2E (0 skipped — credentials in workflow env)
- Staging smoke
- Production verification (config with CI placeholders)

## Execution Blocked Locally

Same as Steps 17–18: no Docker, PostgreSQL, Redis, or `gh` on this machine.

**Next action:** Push repository to GitHub, configure secrets, dispatch workflow.

## Conclusion

Step 19 **prepared and fixed** the GitHub certification workflow. **Execution is BLOCKED** until the repository is on GitHub with secrets configured.
