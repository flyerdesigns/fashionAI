# Integration Testing

## Overview

Integration tests use **Vitest** against a dedicated **PostgreSQL** test database. They exercise real Prisma transactions, credit accounting, admin operations, worker locking, and Stripe webhook idempotency with mocked external providers.

Unit tests live under `tests/` (excluding `tests/integration/`). Integration tests live under `tests/integration/`.

## Setup

1. Create a dedicated test database (never production):

```bash
createdb atelier_ai_test
```

2. Configure `.env.local` or export:

```bash
export DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/atelier_ai_test
```

3. Apply migrations to the test database:

```bash
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
```

## Running tests

```bash
# All tests (integration suites skip when DATABASE_URL_TEST is unset)
npm run test

# Unit tests only
npm run test:unit

# Integration tests (fails fast if env is invalid)
npm run test:integration

# Watch mode
npm run test:watch
```

## Environment guard

`lib/test/env-guard.ts` blocks tests when:

- `NODE_ENV=production`
- `DATABASE_URL_TEST` is missing (for `test:integration`)
- The test URL contains production markers (`prod`, `rds.amazonaws.com`, etc.)
- `DATABASE_URL_TEST === DATABASE_URL` outside CI

## Test data isolation

- Users are created with emails prefixed `integration-test-`
- `afterEach` cleanup deletes all related records for those users
- Stripe events table is cleared during cleanup

## Mocked boundaries

| External service | Mock location |
|-----------------|---------------|
| Stripe SDK | `vi.mock("@/lib/billing/stripe")` in webhook tests |
| Gemini | Not called in integration tests |
| S3 | `STORAGE_PROVIDER=local` in test env |
| Redis | `RATE_LIMIT_PROVIDER=memory` in CI |

## CI

GitHub Actions provisions PostgreSQL 16 and sets `DATABASE_URL_TEST`. See `.github/workflows/ci.yml`.

## Adding tests

Use `describeIntegration` from `tests/integration/setup.ts` so suites skip locally when no test DB is configured:

```typescript
import { describeIntegration } from "./setup";
import { createTestUser } from "./helpers/factories";

describeIntegration("my feature", () => {
  it("works against postgres", async () => {
    const user = await createTestUser();
    // ...
  });
});
```
