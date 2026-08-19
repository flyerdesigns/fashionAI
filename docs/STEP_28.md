# Step 28 — GitHub Staging Core Certification Execution

Execute and verify the Staging Certification workflow with `run_soak=false`.

## Current blocker (this machine)

- `gh` not installed
- No GitHub authentication token
- GitHub API rate limited without auth

**Workflow dispatch must be done manually** until `gh auth login` or a `GITHUB_TOKEN` with `actions:write` is available.

## Manual dispatch (exact steps)

1. Open **GitHub** → **flyerdesigns/fashionAI** → **Actions**
2. Select **Staging Certification** in the workflow list
3. Click **Run workflow**
4. Branch: **main** (commit `c855cb3` or later)
5. **Run 24h soak:** **false**
6. Click **Run workflow**
7. Open the run when it finishes; record the run URL and each job conclusion

Direct link: https://github.com/flyerdesigns/fashionAI/actions/workflows/staging-certification.yml

## What to verify after dispatch

### `certify-core`

Environment, Postgres 16, Redis 7, Prisma migrate, database validation, unit, integration, security, lint, build, app startup, health, staging smoke, Playwright seed, Playwright E2E, production verification.

Targets: 0 failed tests, Playwright 0 skipped, production verification 0 FAIL.

### `certify-providers`

Expected **BLOCKED** or **FAIL** while `STAGING_*` secrets are missing. Do not treat missing credentials as application bugs.

### Soak jobs

Must **not** run with `run_soak=false`.

## Optional CLI (requires user approval to install)

```bash
brew install gh
gh auth login
gh workflow run staging-certification.yml --repo flyerdesigns/fashionAI -f run_soak=false
gh run list --workflow=staging-certification.yml --repo flyerdesigns/fashionAI --limit 1
gh run watch --repo flyerdesigns/fashionAI
```

## After manual dispatch

Share the workflow run URL to update `docs/STEP_28_FINAL_REPORT.md` with verified job results.

See `docs/STEP_28_FINAL_REPORT.md` for the Step 28 outcome.
