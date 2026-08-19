# Step 30 — Real Staging Infrastructure Provisioning

Provision production-like staging: web + 2 workers + Postgres + Redis + S3 + Stripe TEST + Gemini + HTTPS URL.

## Current blocker

**STAGING HOST = BLOCKED — no authenticated hosting provider**

This machine has:

- ✅ `gh` authenticated (can set GitHub secrets/variables and dispatch workflows)
- ❌ No Docker, AWS CLI, Railway, Render, Fly, or Vercel CLI
- ❌ No GitHub `STAGING_*` secrets or `STAGING_BASE_URL` variable
- ❌ No `.env.staging` with real credentials
- ❌ No deployment manifests in the repository

Step 30 **cannot complete provisioning** until you configure external services.

---

## Minimum manual actions (in order)

### 1. Choose a hosting platform

Recommended for fastest 3-process + Postgres + Redis setup:

| Platform | Why |
|----------|-----|
| **Railway** | One project: web + 2 workers + Postgres + Redis plugins |
| **Render** | Web service + 2 background workers + managed Postgres + Redis |
| **Fly.io** | 3 apps/machines + Fly Postgres + Upstash Redis |

Install and authenticate the chosen CLI, or use the provider dashboard.

### 2. Provision dedicated staging data stores

- **PostgreSQL 16** — dedicated staging database (not production)
- **Redis 7** — dedicated staging instance

Run on staging DB after deploy:

```bash
npx prisma migrate deploy
npm run validate:database
PLAYWRIGHT_SEED=true npm run seed:playwright
```

### 3. Provision private S3 bucket

- Dedicated bucket name (e.g. `fashionai-staging-…`)
- IAM user with minimal S3 permissions (staging only)
- Block public access

Verify locally or in CI after secrets are set:

```bash
npm run verify:staging:storage
```

### 4. Configure Stripe TEST mode

- `sk_test_*` secret key only (never `sk_live_*`)
- Create TEST products/prices → note Price IDs
- Webhook endpoint: `https://<STAGING_BASE_URL>/api/stripe/webhook`
- Copy webhook signing secret (`whsec_*`)

Verify:

```bash
npm run verify:staging:stripe
```

### 5. Configure Gemini staging key

- Google AI Studio API key (staging-only)

Verify:

```bash
npm run verify:staging:generation
```

### 6. Deploy three processes

Each process needs the same env vars (from `.env.staging.example`), with production-like providers:

| Service | Start command |
|---------|---------------|
| Web | `npm run build && npm run start` |
| Image worker | `npm run worker:image` |
| Video worker | `npm run worker:video` |

Required env highlights:

```
NODE_ENV=production
DATABASE_PROVIDER=postgres
STORAGE_PROVIDER=s3
RATE_LIMIT_PROVIDER=redis
QUEUE_PROVIDER=bullmq
APP_URL=https://your-staging-url
AUTH_URL=https://your-staging-url
```

### 7. Configure GitHub (never paste secrets in chat)

Repository **Secrets** (Settings → Secrets and variables → Actions):

```
STAGING_AWS_ACCESS_KEY_ID
STAGING_AWS_SECRET_ACCESS_KEY
STAGING_AWS_S3_BUCKET
STAGING_AWS_REGION          (optional, default us-east-1)
STAGING_STRIPE_SECRET_KEY     (sk_test_* only)
STAGING_STRIPE_WEBHOOK_SECRET
STAGING_STRIPE_STARTER_PRICE_ID
STAGING_STRIPE_PRO_PRICE_ID
STAGING_STRIPE_BUSINESS_PRICE_ID
STAGING_GEMINI_API_KEY
```

Repository **Variable**:

```
STAGING_BASE_URL = https://your-real-staging-url
```

Using `gh` (run locally, values prompted securely):

```bash
gh secret set STAGING_AWS_ACCESS_KEY_ID --repo flyerdesigns/fashionAI
# … repeat for each secret …
gh variable set STAGING_BASE_URL --repo flyerdesigns/fashionAI --body "https://your-staging-url"
```

### 8. Verify deployed staging

```bash
curl -sf https://your-staging-url/api/health/live
STAGING_BASE_URL=https://your-staging-url npm run staging:smoke
npm run workers:health
```

### 9. Dispatch staging certification (NOT soak yet)

```bash
gh workflow run staging-certification.yml \
  --repo flyerdesigns/fashionAI \
  --ref main \
  -f run_soak=false

gh run watch --repo flyerdesigns/fashionAI
```

Expected after full provisioning:

- `certify-core` → PASS
- `certify-providers` → PASS
- `certification-summary` → NO-GO (24h soak not run — intentional)

### 10. Only after all provider gates pass

```bash
gh workflow run staging-certification.yml \
  --repo flyerdesigns/fashionAI \
  --ref main \
  -f run_soak=true
```

Do **not** run soak until deployed staging is healthy and provider certification passes.

---

See `docs/STEP_30_FINAL_REPORT.md` for Step 30 outcome and `docs/STAGING.md` for architecture reference.
