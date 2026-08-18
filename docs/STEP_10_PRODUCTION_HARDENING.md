# Step 10 — Production Hardening

Implementation summary for production readiness (Steps 1–9 preserved).

## What Was Added

### Security
- Middleware protects `/video-generation/*`
- Rate limiting on auth, generation, video, billing APIs (`RATE_LIMIT_PROVIDER=memory|redis`)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Request ID propagation via `X-Request-ID`
- Safe API error helper (`lib/api/handler.ts`)
- Redis rate limit fails closed in production when misconfigured

### Observability
- Structured JSON logging (`lib/logging/logger.ts`) with secret redaction
- Health endpoints: `/api/health`, `/api/health/live`, `/api/health/ready`
- Worker graceful shutdown (SIGINT/SIGTERM)

### Credits & Storage
- Credit consistency verification (`npm run verify:credits`)
- Optional repair for stale reservation statuses (`--repair`)
- Storage verification and cleanup (`npm run verify:storage`, `npm run cleanup:storage`)

### Environment
- Centralized validation (`lib/env/validate.ts`)
- Production verification script (`npm run verify:production`)

### Testing
- Vitest suite with unit tests for env, rate limits, credits, prompts, errors, storage keys

### Workers
- Graceful shutdown wrapper (`lib/workers/graceful-shutdown.ts`)
- Alias: `npm run worker:image` → generation worker

## Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Run test suite |
| `npm run verify:production` | Env + health check |
| `npm run verify:credits` | Credit ledger consistency |
| `npm run verify:storage` | Storage reference check |
| `npm run cleanup:storage -- --dry-run` | Preview orphan cleanup |
| `npm run worker:image` | Image generation worker |
| `npm run worker:video` | Video generation worker |

## Not Implemented (Documented Limitations)

- **Admin panel** — deferred; requires `User.role` migration + UI (see audit)
- **BullMQ job queue** — DB polling retained; queue abstraction deferred
- **AuditLog model** — deferred
- **Worker heartbeat DB table** — deferred
- **S3 presigned URL delivery for video** — assets still served via API route
- **Full integration test suite with mocked Prisma** — partial unit coverage only

## Environment Variables Added

See `.env.example`:
- `LOG_LEVEL`
- `RATE_LIMIT_PROVIDER`, `REDIS_URL`
- `RATE_LIMIT_*_PER_MINUTE`

## Rollback

Revert deployment artifacts. No destructive schema changes in Step 10 core implementation.

See `docs/DEPLOYMENT.md` for full production steps.
