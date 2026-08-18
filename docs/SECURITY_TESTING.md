# Security Testing

Security regression tests live in `tests/security/` and require `DATABASE_URL_TEST`.

## Coverage

| Test | Expected |
|------|----------|
| Unauthenticated API | 401 |
| IDOR (user B → user A product) | 404 |
| Admin bypass (user → `/api/admin/*`) | 403 |
| Cross-user storage key | denied |
| Video job with victim storage key | 404 |
| Suspended user API access | 403 |

Run:

```bash
npm run test:security
npm run test:smoke
```

Step 14 additions: account suspension tests (`admin.test.ts`), 100-credit concurrent reservation (`concurrency.test.ts`), video storage key IDOR (`regression.test.ts`).

**Important:** Integration and security tests skip when `DATABASE_URL_TEST` is unset. CI runs the full suite with PostgreSQL 16.

## Principles

- Identity is always derived from authenticated session — never from request body `userId`
- Storage keys embed `users/{userId}/...` and ownership is validated before serving assets
- Admin role is checked server-side against PostgreSQL, not client-provided role fields
- Tests do not log passwords, tokens, or API keys

## Manual checks before production

- [ ] S3 bucket is private
- [ ] `AUTH_SECRET` is unique per environment
- [ ] Stripe webhook signature verification enabled
- [ ] Rate limiting uses Redis in multi-instance deployments
- [ ] Sentry configured with `sendDefaultPii: false`
