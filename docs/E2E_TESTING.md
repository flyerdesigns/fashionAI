# Browser E2E Testing (Playwright)

Playwright tests exercise real browser flows against a running application.

## Setup

```bash
npm install
npx playwright install chromium
```

Configure in `.env.local` or CI:

```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_TEST_EMAIL=...
PLAYWRIGHT_TEST_PASSWORD=...
PLAYWRIGHT_ADMIN_TEST_EMAIL=...
PLAYWRIGHT_ADMIN_TEST_PASSWORD=...
PLAYWRIGHT_SUSPENDED_TEST_EMAIL=...
PLAYWRIGHT_SUSPENDED_TEST_PASSWORD=...
```

Seed users:

```bash
DATABASE_URL=... PLAYWRIGHT_SEED=true npm run seed:playwright
```

## Run

```bash
# Starts dev server automatically (unless PLAYWRIGHT_SKIP_WEBSERVER=true)
npm run test:e2e

npm run test:e2e:headed
npm run test:e2e:ui
```

Against staging:

```bash
PLAYWRIGHT_BASE_URL=https://staging.example.com PLAYWRIGHT_SKIP_WEBSERVER=true npm run test:e2e
```

## Test Files

| File | Coverage |
|------|----------|
| `01-auth.spec.ts` | Login, logout, protected redirect |
| `02-products.spec.ts` | Products page |
| `03-create.spec.ts` | Create flow, no nested buttons |
| `04-credits.spec.ts` | Credits balance |
| `05-billing.spec.ts` | Billing UI, checkout API (Stripe optional) |
| `06-admin.spec.ts` | Admin access control |
| `07-suspension.spec.ts` | Suspend/unsuspend, billing recovery |
| `08-health.spec.ts` | Health endpoints (no auth) |

## Console Regression

Tests fail on:
- Hydration errors
- Uncaught exceptions
- React nested button warnings

Ignored (documented): React DevTools, Fast Refresh, middleware deprecation advisory.

## CI

GitHub Actions runs Playwright after `npm run build` with `npm run start` as web server.
No paid external APIs are called.

## API Integration Tests

For PostgreSQL-level E2E without a browser, see `docs/INTEGRATION_TESTING.md` and `npm run test:integration`.
