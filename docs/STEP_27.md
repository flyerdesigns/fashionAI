# Step 27 — GitHub Staging Core Certification

Execute the maximum legitimate staging certification via GitHub Actions **without** real provider credentials or a deployed staging environment.

## Prerequisites

- Repository: https://github.com/flyerdesigns/fashionAI
- Branch: `main`
- CI green on latest commit
- **Do not** deploy to cloud yet
- **Do not** invent secrets or URLs

## What runs with `run_soak=false`

### `certify-core` (no provider secrets required)

- Infrastructure probe (Postgres + Redis service containers)
- Prisma generate, validate, migrate deploy
- `validate:database`
- Lint, unit, integration, security, smoke tests
- Build
- Seed Playwright users
- Start app → `staging:smoke` → Playwright E2E
- Production verification (placeholder S3/Stripe/Gemini env for config checks)

### `certify-providers` (requires GitHub secrets)

Runs only after core succeeds. Without `STAGING_*` secrets, provider steps fail or are invalid — summary reports **BLOCKED**.

### Soak jobs

Skipped when `run_soak=false` or `STAGING_BASE_URL` is unset.

## Manual dispatch (required if `gh` unavailable)

1. Open https://github.com/flyerdesigns/fashionAI/actions/workflows/staging-certification.yml
2. Click **Run workflow**
3. Branch: **main**
4. **Run 24h soak:** `false`
5. Click **Run workflow**
6. Monitor the run; open **Core certification** job for step-level results
7. Open **Certification summary** for final NO-GO reason (expected: providers BLOCKED)

## Optional: dispatch with GitHub CLI

```bash
brew install gh
gh auth login
gh workflow run staging-certification.yml --repo flyerdesigns/fashionAI -f run_soak=false
gh run watch --repo flyerdesigns/fashionAI
```

## Honest GO criteria (not met in Step 27)

Production **GO** requires all of: core PASS, deployed staging, real S3, Stripe TEST, Gemini/Veo, healthy workers, deployed E2E, 24h soak, post-soak E2E, `verify:production` 0 FAIL.

Step 27 target: **core certification PASS** + document remaining **BLOCKED** items.

See `docs/STEP_27_FINAL_REPORT.md` for results.
