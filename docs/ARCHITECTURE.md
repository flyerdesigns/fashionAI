# Architecture Overview

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS
- **Auth:** Auth.js v5 (JWT), Google OAuth + credentials
- **Database:** PostgreSQL via Prisma 7
- **Storage:** AWS S3 (production) / local filesystem (development)
- **AI:** Google Gemini (images), Gemini Veo (video)
- **Billing:** Stripe subscriptions + webhooks
- **Workers:** Polling workers with PostgreSQL job locking

## Layers

```
UI (app/, components/)
  ↓
API Routes (app/api/)
  ↓
Services (lib/*/service.ts)
  ↓
Repositories (lib/*/repository.ts → postgres | json)
  ↓
PostgreSQL / .data/
```

## Generation Pipeline

```
POST /api/generate/*
  → Service validates ownership + credits
  → Job created in PostgreSQL
  → Credits reserved atomically
  → Worker claims job (lockedAt/lockedBy)
  → Provider generates content
  → Upload to S3/local
  → Credits settled (consume / refund)
```

## Credit Model

- `balance` — available credits
- `reserved` — held for in-flight jobs
- Reservation linked 1:1 to generation or video job
- Settlement on job completion: consume successful units, release failed

## Security Model

- Session JWT — userId from token only
- Middleware protects routes + API (except health, auth, Stripe webhook)
- Asset serving requires ownership check
- Rate limiting on expensive endpoints (memory dev / Redis prod)
- Secrets server-side only
- **Admin panel:** `User.role` in PostgreSQL; `/admin` + `/api/admin/*` require admin role (middleware + server-side DB check)
- **Account status:** `User.status` (`active` | `suspended`); suspended users blocked from generation/API; billing portal allowed for recovery
- **AuditLog:** all sensitive admin actions recorded with sanitized metadata

See `docs/ADMIN_PANEL.md` for admin architecture.

## Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| DATABASE_PROVIDER | json or postgres | postgres |
| STORAGE_PROVIDER | local | s3 |
| RATE_LIMIT_PROVIDER | memory | redis |
| Workers | local terminals | separate containers |

See also: `docs/DEPLOYMENT.md`, `docs/STEP_12.md`, `docs/STEP_14.md`, `docs/E2E_TESTING.md`

## Testing & Observability (Step 12)

- **Unit tests:** `npm run test:unit` — Vitest, no database required
- **Integration tests:** `npm run test:integration` — PostgreSQL via `DATABASE_URL_TEST`
- **Request tracing:** `X-Request-ID` on all responses; propagated to logs and audit entries
- **Metrics:** in-memory counters in `lib/metrics` (export-ready abstraction)
- **Sentry:** optional via `SENTRY_DSN`; see `docs/OBSERVABILITY.md`
- **CI:** `.github/workflows/ci.yml` runs lint, tests, integration tests, build, Playwright E2E
