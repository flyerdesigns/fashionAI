# Step 15 — Pre-Implementation Audit

**Date:** 2026-03-20  
**Scope:** Staging soak, Playwright E2E, go-live readiness (verified against code)

## Stack Summary (Steps 1–14)

| Area | Implementation |
|------|----------------|
| Auth | Auth.js v5 JWT; `/login`, `/signup`; credentials + optional Google |
| Protected routes | `middleware.ts` — dashboard, create, products, credits, settings, admin, etc. |
| Credits | PostgreSQL ledger; atomic reserve/settle |
| Generation | `POST /api/generate/photoshoot`; worker `npm run worker:image` |
| Video | `POST /api/generate/video`; worker `npm run worker:video` |
| Storage | `STORAGE_PROVIDER=local\|s3`; signed URLs via `/api/assets/signed` |
| Billing | Stripe checkout/portal; credits from `invoice.paid` only |
| Admin | `/admin/*`; role from DB; audit logs |
| Suspension | `User.status`; `/account-suspended`; billing recovery allowed |
| Health | `/api/health`, `/api/health/live`, `/api/health/ready` |
| Tests | Vitest unit/integration/security/smoke — **no browser E2E** |
| Verify | `npm run verify:production` with PASS/WARN/FAIL |

## Auth Flow (Verified)

| Step | Route / File |
|------|----------------|
| Login page | `app/(auth)/login/page.tsx` → `LoginForm` |
| Signup page | `app/(auth)/signup/page.tsx` → `SignupForm` |
| Credentials sign-in | `lib/auth/actions.ts` → `signInWithCredentials` → redirect `/dashboard` |
| Logout | `logoutAction()` in sidebar → `/login` |
| Session guards | `lib/auth/service.ts` — `requireUser`, `requireApiUser` |

**Selectors for E2E:** `#email`, `#password`, button "Sign In", sidebar "Log out"

## Key Pages

| Route | File | Auth |
|-------|------|------|
| `/dashboard` | `app/(app)/dashboard/page.tsx` | required |
| `/create` | `app/(app)/create/page.tsx` | required |
| `/products` | `app/(app)/products/page.tsx` | required |
| `/credits` | `app/(app)/credits/page.tsx` | required |
| `/settings/billing` | `app/(app)/settings/billing/page.tsx` | required (suspended allowed) |
| `/admin` | `app/(app)/admin/page.tsx` | admin only |
| `/account-suspended` | `app/account-suspended/page.tsx` | suspended users |

## Admin Bootstrap

- `ADMIN_EMAILS` env (comma-separated) → `resolveRoleForEmail()` assigns admin on signup
- Admin nav shown only when `user.role === "admin"` (`Sidebar.tsx`)

## Account Suspension (Step 14)

- Login blocked for suspended users (`auth.ts` authorize/signIn)
- Middleware redirects protected pages → `/account-suspended`
- Allowed for suspended: `/account-suspended`, `/settings/billing`, `GET /api/billing/subscription`, `POST /api/billing/portal`, `/api/auth/*`
- Admin API: `PATCH /api/admin/users/[id]/status`

## Storage

- Factory: `lib/storage/index.ts` → local or S3 via `isS3Enabled()`
- S3 config: `AWS_S3_BUCKET`, credentials, optional `AWS_ENDPOINT`
- Ownership: `lib/assets/authorization.ts` — `canUserAccessAsset`

## Workers

| Script | Purpose |
|--------|---------|
| `npm run worker:image` | Image generation worker |
| `npm run worker:video` | Video generation worker |
| `npm run workers:health` | Stale heartbeat detection |

Heartbeats: `lib/workers/heartbeat.ts` → `WorkerHeartbeat` table

## Existing Test Gaps (Step 15 Targets)

| Gap | Step 15 Action |
|-----|----------------|
| No Playwright | Add `@playwright/test` + `tests/e2e/` |
| No browser hydration checks | Console guard in E2E |
| No staging smoke script | `scripts/staging-smoke.ts` |
| No soak tooling | `scripts/soak-test.ts` |
| Real S3/Stripe/Gemini not in CI | Staging scripts + docs; skip when unconfigured |
| `lib/mock/dashboard.ts` | `mockDashboardStats` unused; `mockQuickCreateOptions` still used on dashboard |

## UI / Hydration Status

- `CreateFlowEntry.tsx` — fixed (outer `<button>`, inner `<span>`)
- Link+Button nesting — fixed Step 14 in 5 files
- `Button.tsx` — renders `<Link>` when `href` set (correct pattern)

## Required Environment Variables (Staging E2E)

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_BASE_URL` | Target app URL (default `http://localhost:3000`) |
| `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` | Normal user |
| `PLAYWRIGHT_ADMIN_TEST_EMAIL` / `PLAYWRIGHT_ADMIN_TEST_PASSWORD` | Admin user |
| `PLAYWRIGHT_SUSPENDED_TEST_EMAIL` / `PLAYWRIGHT_SUSPENDED_TEST_PASSWORD` | Suspended user (pre-seeded) |
| `DATABASE_URL` | Required for user seeding in CI/staging |
| `AUTH_SECRET` | Required for auth in E2E |

Provider staging (optional — skip if missing):

- S3: `STORAGE_PROVIDER=s3`, AWS vars, `STAGING_ENV`
- Stripe: `STRIPE_SECRET_KEY`, webhook secret, price IDs
- Gemini: `GEMINI_API_KEY`, `VIDEO_PROVIDER_API_KEY`

## CI Current State

`.github/workflows/ci.yml`: lint, unit, integration, security, smoke, build, verify:production — **no Playwright**

## Step 15 Implementation Plan

1. Playwright config + npm scripts
2. Eight E2E specs with console regression guard
3. `scripts/seed-playwright-users.ts` for CI/staging accounts
4. Staging verification scripts (storage, smoke, soak)
5. Provider test scripts (document + skip when unconfigured)
6. Enhanced `verify:production`
7. CI Playwright job (deterministic, no paid APIs)
8. Documentation + GO-LIVE checklist
