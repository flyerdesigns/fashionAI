# Production Smoke Tests

Lightweight smoke tests verify deployment health without expensive AI generation.

## Run

```bash
npm run test:smoke
```

No database required for most smoke tests.

## Checks

| Check | File |
|-------|------|
| Liveness | `getLivenessCheck()` |
| Readiness (no secrets in output) | `getReadinessCheck()` |
| Environment validation | `validateEnvironment()` |
| Health API routes | `/api/health`, `/live`, `/ready` |

## Post-deploy smoke checklist

1. `curl https://your-domain/api/health/live` → 200
2. `curl https://your-domain/api/health/ready` → 200 or degraded (not unavailable)
3. Login with test account
4. `npm run workers:health` → exit 0
5. Check Sentry receives no PII in test error (optional)

Smoke tests do **not** call Gemini, Stripe live API, or production S3.
