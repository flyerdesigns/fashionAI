# Step 20 — Publish Repository & Execute GitHub Certification

## Current Status

- Local git repository initialized in `/Users/zeel/FahionAI`
- Initial commit created: `Prepare staging certification pipeline (Steps 15–19)`
- **GitHub remote: BLOCKED** — no repository URL documented in project

---

## Required From Project Owner

### 1. GitHub Repository URL

Provide the intended repository URL, for example:

```text
https://github.com/YOUR_ORG/fahion-ai.git
```

Then run:

```bash
cd /Users/zeel/FahionAI
git remote add origin <REAL_REPOSITORY_URL>
git push -u origin main
```

Do not guess or create a duplicate repository without confirmation.

### 2. GitHub Secrets

**Settings → Secrets and variables → Actions → Secrets**

| Secret | Notes |
|--------|-------|
| `STAGING_AWS_ACCESS_KEY_ID` | Staging IAM user |
| `STAGING_AWS_SECRET_ACCESS_KEY` | Staging IAM secret |
| `STAGING_AWS_S3_BUCKET` | Dedicated private staging bucket |
| `STAGING_STRIPE_SECRET_KEY` | `sk_test_*` only |
| `STAGING_STRIPE_WEBHOOK_SECRET` | Stripe TEST webhook signing secret |
| `STAGING_GEMINI_API_KEY` | Staging Gemini/Veo key |

Optional: `STAGING_AWS_REGION`, `STAGING_STRIPE_*_PRICE_ID`

### 3. GitHub Variable

| Variable | Value |
|----------|-------|
| `STAGING_BASE_URL` | HTTPS URL of deployed staging app |

### 4. Deployed Staging Application

Staging must include:

- Next.js application (HTTPS)
- PostgreSQL
- Redis
- S3 (staging bucket)
- Stripe TEST mode
- Gemini/Veo credentials
- Image + video workers

Configure environment from `.env.staging.example` on the staging host (never commit secrets).

---

## Execute Certification

After push + secrets + staging deployment:

1. **Actions → Staging Certification → Run workflow**
2. First run: `run_soak = false`
3. Target: `certify-core` PASS (0 Playwright skips, 0 integration skips)
4. With secrets: `certify-providers` PASS
5. Final GO: `run_soak = true` (requires `STAGING_BASE_URL` + 24h)

---

## What `certify-core` Validates (No Provider Secrets)

- PostgreSQL 16 + Redis 7 (GitHub service containers)
- Migrations + database validation
- Lint, unit (44), integration (57), security (5), smoke (4)
- Build + Playwright E2E (17 tests, credentials in workflow env)
- Staging smoke
- Production verification (config placeholders)

---

## GO Criteria

See `docs/GO_LIVE_CHECKLIST.md` and `docs/STEP_20_FINAL_REPORT.md`.

**GO** only after: core + providers + workers + 24h soak + post-soak validation + 0 verify:production FAIL.

---

## Alternative: GitHub CLI

If `gh` is installed and authenticated:

```bash
gh workflow run staging-certification.yml -f run_soak=false
gh run watch
```

Currently **BLOCKED** — `gh` not installed on this machine.
