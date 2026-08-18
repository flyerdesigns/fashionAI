# Admin Panel

Production admin tooling for Atelier AI operators.

## Architecture

```
/admin (UI, server-side requireAdminUser)
  ↓
/api/admin/* (requireAdminApi + DB role check)
  ↓
lib/admin/* services (PostgreSQL aggregates + existing domain services)
  ↓
AuditLog (createAuditLog on sensitive actions)
```

## Roles

Stored on `User.role`:

| Value | Meaning |
|-------|---------|
| `user` | Default for all new and existing users |
| `admin` | Full admin panel + API access |

Roles are **never** accepted from signup or normal user APIs. Only an existing admin can promote another user via `PATCH /api/admin/users/[id]/role`.

Set initial admin via SQL after migration:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'you@company.com';
```

Sign out/in to refresh JWT role claim.

## Authorization

- **UI:** `requireAdminUser()` — redirects non-admins to `/dashboard`
- **API:** `requireAdminApi()` / `requireAdmin()` — returns `403 Forbidden`
- **Middleware:** `/admin/*` and `/api/admin/*` require session + JWT `role=admin` (defense in depth; APIs also verify against DB)

## Audit logging

Model: `AuditLog` with `userId` (actor), `targetUserId`, `action`, `resourceType`, `resourceId`, `metadata`, `ipAddress`, `requestId`.

Typed actions in `lib/audit/actions.ts`. Metadata is sanitized — passwords, API keys, and secrets are redacted.

## Credit adjustments

Admin grant/deduct/refund via:

- `POST /api/admin/credits/grant`
- `POST /api/admin/credits/deduct`
- `POST /api/admin/credits/refund`

Each operation:

1. Validates amount + reason
2. Uses atomic `creditService` transaction
3. Creates ledger entry (`admin_grant`, `admin_deduct`, `admin_refund`)
4. Writes audit log

## Job management

Admin retry/cancel delegates to existing `generationService` and `videoService` using the **job owner's** userId — no duplicate generation logic, no direct Gemini calls.

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/stats` | Dashboard aggregates |
| GET | `/api/admin/users` | User list |
| GET | `/api/admin/users/[id]` | User detail |
| PATCH | `/api/admin/users/[id]/role` | Promote/demote |
| GET | `/api/admin/users/[id]/credits` | Credit history |
| GET | `/api/admin/users/[id]/usage` | Usage history |
| GET | `/api/admin/jobs` | Job list |
| GET | `/api/admin/jobs/[id]?type=image\|video` | Job detail |
| POST | `/api/admin/jobs/[id]/retry` | Retry failed job |
| POST | `/api/admin/jobs/[id]/cancel` | Cancel job |
| GET | `/api/admin/photoshoots` | Photoshoot list |
| GET | `/api/admin/photoshoots/[id]` | Photoshoot detail |
| GET | `/api/admin/videos` | Video list |
| GET | `/api/admin/videos/[id]` | Video detail |
| GET | `/api/admin/subscriptions` | Subscription list |
| GET | `/api/admin/audit-logs` | Audit log |
| POST | `/api/admin/credits/grant` | Grant credits |
| POST | `/api/admin/credits/deduct` | Deduct credits |
| POST | `/api/admin/credits/refund` | Refund credits |

## UI routes

- `/admin` — Overview
- `/admin/users`, `/admin/users/[id]`
- `/admin/jobs`, `/admin/jobs/[id]`
- `/admin/photoshoots`, `/admin/photoshoots/[id]`
- `/admin/videos`, `/admin/videos/[id]`
- `/admin/subscriptions`
- `/admin/credits`
- `/admin/audit-logs`

Admin nav is only visible when `user.role === 'admin'`.

## Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

Migrations:

- `20260319000000_step11_admin_observability` — `User.role`, `AuditLog`, `WorkerHeartbeat`
- `20260319100000_admin_audit_logs` — `AuditLog.requestId`, composite indexes

## Testing

```bash
npm run test
npm run lint
npm run build
```

## Security notes

- No passwords, hashes, or provider secrets in admin responses
- No client-controlled actor IDs
- Self-demotion blocked
- Asset URLs use authenticated `/api/assets` proxy — not raw S3 URLs
- Subscriptions are read-only (Stripe remains source of truth)

## Limitations

- Account suspension not implemented (user model has no status field)
- Admin UI pagination loads first page server-side; use API query params for full pagination
- JSON dev mode: admin stats/credits limited; PostgreSQL required for full admin ops
