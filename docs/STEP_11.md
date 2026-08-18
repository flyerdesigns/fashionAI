# Step 11 — Admin, Queue, Observability & Scale

Step 11 extends production hardening with operational tooling deferred from Step 10.

## Implemented

### Admin panel (`/admin`)
- **Schema:** `User.role`, `AuditLog`, `WorkerHeartbeat`
- **Bootstrap:** set `ADMIN_EMAILS=you@company.com` (comma-separated) for first admin on signup
- **Pages:** Overview, Users, Jobs, Audit Log, System Health
- **APIs:** `/api/admin/*` (stats, users, role updates, credit adjustments, jobs, audit, system)
- **Auth:** middleware + server-side `requireAdminUser()` / `requireAdminApi()` with DB role verification

### S3 presigned URLs
- Real presigned URLs via `@aws-sdk/s3-request-presigner`
- Video assets redirect to presigned URLs (no Next.js buffering)
- `GET /api/assets/signed?key=...` returns time-limited URL JSON

### Job queue abstraction
- `QUEUE_PROVIDER=local|bullmq` (default: `local`)
- BullMQ wake signals when `REDIS_URL` is set (DB polling remains source of truth)
- `notifyJobQueued()` called after image/video job creation

### Worker observability
- Heartbeats written to `WorkerHeartbeat` table
- `npm run workers:health` — reports stale workers (exit 1 if stale)
- Admin System page shows readiness + worker status

## Environment

```env
ADMIN_EMAILS=admin@yourcompany.com
QUEUE_PROVIDER=local
WORKER_HEARTBEAT_STALE_MS=60000
```

For BullMQ:
```env
QUEUE_PROVIDER=bullmq
REDIS_URL=redis://...
```

## Commands

```bash
npx prisma migrate deploy
npm run workers:health
npm run worker:image
npm run worker:video
```

## Promoting an existing user to admin

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'you@company.com';
```

Then sign out and sign back in to refresh JWT role.

## Remaining (Step 12 candidates)

- Full integration tests with mocked Prisma for admin APIs
- APM/tracing (Sentry/Datadog)
- Admin pagination UI (currently loads first page server-side)
- Redis package upgrade to v5+ for native BullMQ peer alignment
