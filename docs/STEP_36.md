# Step 36 — Staging Providers + GitHub Certification Configuration

**Goal:** Configure AWS S3, Stripe TEST, and Gemini on Railway + GitHub, then dispatch Staging Certification (`run_soak=false`).

**Prerequisite:** Step 35 infrastructure live at https://fashionai-staging-web-production.up.railway.app

---

## Phase 1 — Audit Railway

Verify all five resources Online and required non-secret vars PRESENT on web (see `docs/STEP_36_AUDIT.md`).

Workers need: DATABASE_URL, REDIS_URL, provider flags, AUTH_SECRET, NIXPACKS_NODE_VERSION=22.

---

## Phase 2 — Obtain provider credentials

Required GitHub secrets (map to app env on Railway):

| GitHub secret | Railway variable |
|---------------|------------------|
| STAGING_AWS_ACCESS_KEY_ID | AWS_ACCESS_KEY_ID |
| STAGING_AWS_SECRET_ACCESS_KEY | AWS_SECRET_ACCESS_KEY |
| STAGING_AWS_S3_BUCKET | AWS_S3_BUCKET |
| STAGING_AWS_REGION | AWS_REGION |
| STAGING_STRIPE_SECRET_KEY | STRIPE_SECRET_KEY (sk_test_* only) |
| STAGING_STRIPE_WEBHOOK_SECRET | STRIPE_WEBHOOK_SECRET |
| STAGING_STRIPE_STARTER_PRICE_ID | STRIPE_STARTER_PRICE_ID |
| STAGING_STRIPE_PRO_PRICE_ID | STRIPE_PRO_PRICE_ID |
| STAGING_STRIPE_BUSINESS_PRICE_ID | STRIPE_BUSINESS_PRICE_ID |
| STAGING_GEMINI_API_KEY | GEMINI_API_KEY, VIDEO_PROVIDER_API_KEY |

Set on **web**, **image-worker**, and **video-worker**.

Never commit values. Use `gh secret set` and `railway variable set --stdin` for secrets.

---

## Phase 3 — Configure Railway

After credentials are available:

```bash
cd /Users/zeel/FahionAI
railway link  # fashionAI-staging

# Example (repeat per service, use stdin for secrets):
railway variable set AWS_S3_BUCKET=<bucket> STORAGE_PROVIDER=s3 --service fashionai-staging-web
echo "<secret>" | railway variable set AWS_ACCESS_KEY_ID --stdin --service fashionai-staging-web
# ... image-worker, video-worker ...
```

Redeploy affected services if variables do not auto-reload.

---

## Phase 4 — Configure GitHub

```bash
gh variable set STAGING_BASE_URL -R flyerdesigns/fashionAI \
  --body "https://fashionai-staging-web-production.up.railway.app"

gh secret set STAGING_AWS_ACCESS_KEY_ID -R flyerdesigns/fashionAI
# ... all STAGING_* secrets ...
```

Verify names only: `gh secret list`, `gh variable list`.

**Step 36 completed:** `STAGING_BASE_URL` configured. Secrets remain for user.

---

## Phase 5 — Stripe webhook

In Stripe TEST dashboard, add endpoint:

`https://fashionai-staging-web-production.up.railway.app/api/stripe/webhook`

Copy signing secret → `STAGING_STRIPE_WEBHOOK_SECRET` → Railway + GitHub.

---

## Phase 6 — Validate

```bash
curl https://fashionai-staging-web-production.up.railway.app/api/health/live
curl https://fashionai-staging-web-production.up.railway.app/api/health/ready

npm run verify:staging:storage   # after S3 configured
npm run verify:staging:stripe    # after Stripe configured
```

---

## Phase 7 — Database / Playwright

Already applied via web preDeploy (`scripts/railway-predeploy.sh`). Re-run only if needed:

```bash
railway ssh --service fashionai-staging-web npx prisma migrate deploy
railway ssh --service fashionai-staging-web npm run seed:playwright
```

Do not run `prisma migrate reset`.

---

## Phase 8 — Dispatch certification

Only when all provider secrets exist and staging is healthy:

```bash
gh workflow run staging-certification.yml -R flyerdesigns/fashionAI -f run_soak=false
gh run watch -R flyerdesigns/fashionAI
```

**Do not** use `run_soak=true` in Step 36.

---

## Blockers (this run)

All `STAGING_*` provider secrets **MISSING** in environment and GitHub. Certification not dispatched.
