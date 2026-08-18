# Deployment Guide

## Architecture

Production runs as **three separate processes**:

| Process | Command | Purpose |
|---------|---------|---------|
| Web | `npm run build && npm start` | Next.js application |
| Image worker | `npm run worker:image` | Gemini image generation |
| Video worker | `npm run worker:video` | Gemini Veo video generation |

Do not run workers inside the Next.js server process.

## Prerequisites

- PostgreSQL 14+
- AWS S3 private bucket
- Stripe account (test or live)
- Google AI API key (Gemini + Veo)
- Redis (recommended for rate limiting in multi-instance deployments)

## Environment

Copy `.env.example` to `.env` and configure for production:

```
DATABASE_PROVIDER=postgres
STORAGE_PROVIDER=s3
RATE_LIMIT_PROVIDER=redis
NODE_ENV=production
```

Run validation:

```bash
VERIFY_PRODUCTION=true npm run verify:production
```

Resolve all `[FAIL]` items before deploy. `[WARN]` items (Sentry, Stripe Price IDs, worker heartbeats) should be reviewed.

## Database

```bash
npx prisma migrate deploy   # includes User.status (Step 14)
npx prisma generate
```

Optional backfills:

```bash
npm run migrate:credit-accounts -- --execute
```

## Staging & E2E (Step 15)

```bash
npm run seed:playwright      # dedicated test accounts
npm run test:e2e             # Playwright browser tests
npm run staging:smoke        # staging HTTP + subsystem checks
npm run soak:test            # 24h monitoring (safe defaults)
```

See `docs/STAGING.md`, `docs/GO_LIVE_CHECKLIST.md`, `docs/STEP_16.md`.

For local validation stack:

```bash
docker compose -f docker-compose.staging.yml up -d
```

## Workers

Run in separate terminals or containers:

```bash
npm run worker:image
npm run worker:video
```

Schedule credit recovery (cron):

```bash
npm run recover:credit-reservations -- --execute
```

## Stripe Webhook

Configure endpoint: `POST https://your-domain.com/api/stripe/webhook`

Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Overall status |
| `GET /api/health/live` | Liveness |
| `GET /api/health/ready` | Readiness (DB, storage) |

## Verification

```bash
npm run lint
npm run test
npm run test:integration   # requires DATABASE_URL_TEST
npm run build
npm run verify:production
npm run verify:credits
npm run verify:storage
```

## Observability (Step 12)

Optional Sentry error monitoring:

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_ORG=your-org
SENTRY_PROJECT=atelier-ai
```

Leave `SENTRY_DSN` empty to disable. See `docs/OBSERVABILITY.md`.

Integration tests use a dedicated database:

```bash
export DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/atelier_ai_test
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
npm run test:integration
```

See `docs/INTEGRATION_TESTING.md`.

## Rollback

1. Revert web deployment to previous image/release
2. Revert worker deployments
3. Do **not** run destructive migrations
4. If billing webhook issues occur, replay events from Stripe dashboard after fix
