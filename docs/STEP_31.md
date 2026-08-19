# Step 31 — Staging Host Provisioning (Railway)

Provision real staging on **Railway**: web + image worker + video worker + PostgreSQL + Redis, then S3 / Stripe TEST / Gemini via GitHub secrets.

## Blocker (current)

**Railway is not installed or authenticated on this machine.**

Run locally (browser login required):

```bash
brew install railway
railway login
railway whoami
```

Do **not** paste tokens or secrets in chat.

---

## Railway project layout

One project, **five services**:

| Service | Type | Start command |
|---------|------|---------------|
| `fashionai-staging-web` | Web (uses `railway.toml`) | `npm start` (after build) |
| `fashionai-staging-image-worker` | Worker | `npm run worker:image` |
| `fashionai-staging-video-worker` | Worker | `npm run worker:video` |
| PostgreSQL | Plugin | (provider-managed `DATABASE_URL`) |
| Redis | Plugin | (provider-managed `REDIS_URL`) |

### Create project

```bash
cd /Users/zeel/FahionAI
railway init          # new project: fashionai-staging
railway link
```

Add plugins in Railway dashboard or CLI:

```bash
railway add --plugin postgresql
railway add --plugin redis
```

### Web service

Link repo `flyerdesigns/fashionAI`, branch `main`.  
`railway.toml` at repo root sets build + healthcheck.

Build: `npm ci --legacy-peer-deps && npm run build`  
Start: `npm start`  
Health: `/api/health/live`

Set `NIXPACKS_NODE_VERSION=20` on all Node services.

### Worker services

Create **two additional services** from the same GitHub repo:

1. **Image worker** — build: `npm ci --legacy-peer-deps && npx prisma generate`; start: `npm run worker:image`
2. **Video worker** — same build; start: `npm run worker:video`

Share the same environment variables as web (except workers do not need `AUTH_URL` public exposure, but need DB/Redis/S3/Gemini).

---

## Required environment variables

Copy from `.env.staging.example`. Production-like staging:

```env
NODE_ENV=production
DATABASE_PROVIDER=postgres
DATABASE_URL=<from Railway Postgres plugin>
REDIS_URL=<from Railway Redis plugin>
RATE_LIMIT_PROVIDER=redis
QUEUE_PROVIDER=bullmq
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<staging IAM>
AWS_SECRET_ACCESS_KEY=<staging IAM>
AWS_S3_BUCKET=<private staging bucket>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
GEMINI_API_KEY=...
VIDEO_PROVIDER_API_KEY=...   # same as GEMINI or dedicated
AUTH_SECRET=<min 32 chars, unique staging>
APP_URL=https://<railway-web-domain>
AUTH_URL=https://<railway-web-domain>
NEXT_PUBLIC_APP_URL=https://<railway-web-domain>
STAGING_BASE_URL=https://<railway-web-domain>
STAGING_ENV=staging
PLAYWRIGHT_*=<seed credentials from .env.staging.example>
```

Generate public HTTPS domain for web service in Railway → use for `APP_URL`, Stripe webhook, and `STAGING_BASE_URL`.

---

## After deploy — database

Against staging `DATABASE_URL` (never print URL):

```bash
npx prisma migrate deploy
npm run validate:database
PLAYWRIGHT_SEED=true npm run seed:playwright
```

---

## External providers (before provider certification)

### S3

Private bucket + IAM user → verify:

```bash
npm run verify:staging:storage
```

### Stripe TEST

Webhook: `https://<STAGING_BASE_URL>/api/stripe/webhook`  
Verify:

```bash
npm run verify:staging:stripe
```

### Gemini

```bash
npm run verify:staging:generation
```

Start workers before generation verification.

---

## GitHub configuration

After staging is healthy:

```bash
STAGING_URL="https://your-railway-web-domain"

gh secret set STAGING_AWS_ACCESS_KEY_ID --repo flyerdesigns/fashionAI
gh secret set STAGING_AWS_SECRET_ACCESS_KEY --repo flyerdesigns/fashionAI
gh secret set STAGING_AWS_S3_BUCKET --repo flyerdesigns/fashionAI
gh secret set STAGING_AWS_REGION --repo flyerdesigns/fashionAI
gh secret set STAGING_STRIPE_SECRET_KEY --repo flyerdesigns/fashionAI
gh secret set STAGING_STRIPE_WEBHOOK_SECRET --repo flyerdesigns/fashionAI
gh secret set STAGING_STRIPE_STARTER_PRICE_ID --repo flyerdesigns/fashionAI
gh secret set STAGING_STRIPE_PRO_PRICE_ID --repo flyerdesigns/fashionAI
gh secret set STAGING_STRIPE_BUSINESS_PRICE_ID --repo flyerdesigns/fashionAI
gh secret set STAGING_GEMINI_API_KEY --repo flyerdesigns/fashionAI

gh variable set STAGING_BASE_URL --repo flyerdesigns/fashionAI --body "$STAGING_URL"
```

---

## Pre-certification checks

```bash
curl -sf "$STAGING_URL/api/health/live"
STAGING_BASE_URL=$STAGING_URL npm run staging:smoke
npm run workers:health
```

---

## Staging certification (NOT soak)

```bash
gh workflow run staging-certification.yml \
  --repo flyerdesigns/fashionAI \
  --ref main \
  -f run_soak=false

gh run watch --repo flyerdesigns/fashionAI
```

**Do not** run `run_soak=true` until providers + deployed validation all pass.

See `docs/STEP_31_FINAL_REPORT.md` for Step 31 outcome.
