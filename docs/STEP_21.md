# Step 21 — Connect GitHub & Prepare Staging

## Repository

| Item | Value |
|------|-------|
| GitHub URL | https://github.com/flyerdesigns/fashionAI.git |
| Local path | `/Users/zeel/FahionAI` |
| Branch | `main` |
| Remote | `origin` → configured |

## Push (blocked until auth fixed)

```bash
cd /Users/zeel/FahionAI
git push -u origin main
```

If 403: ensure your GitHub account has **Write** access to `flyerdesigns/fashionAI`.

## After Push

### 1. Confirm CI

Push to `main` triggers `.github/workflows/ci.yml` (Postgres + Redis + full test suite).

### 2. GitHub Secrets

Settings → Secrets and variables → Actions:

| Secret | Purpose |
|--------|---------|
| `STAGING_AWS_ACCESS_KEY_ID` | S3 staging |
| `STAGING_AWS_SECRET_ACCESS_KEY` | S3 staging |
| `STAGING_AWS_S3_BUCKET` | Staging bucket |
| `STAGING_STRIPE_SECRET_KEY` | `sk_test_*` only |
| `STAGING_STRIPE_WEBHOOK_SECRET` | Webhook validation |
| `STAGING_GEMINI_API_KEY` | Generation |

### 3. Repository Variable

| Variable | Example |
|----------|---------|
| `STAGING_BASE_URL` | `https://staging.yourdomain.com` |

### 4. Staging Certification

Actions → **Staging Certification** → Run workflow → `run_soak=false`

See `docs/STEP_19.md` and `docs/GO_LIVE_CHECKLIST.md`.
