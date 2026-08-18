# Observability

## Request tracing

Every HTTP request receives an `X-Request-ID` header:

- Middleware and `withApiAuth` preserve an incoming valid request ID
- Otherwise a new UUID is generated
- Request ID appears in structured logs and API error JSON (`requestId` field)
- Admin audit logs store `requestId` when available

## Structured logging

Logs are JSON lines via `lib/logging/logger.ts`. Sensitive keys (password, secret, authorization, stripe, api_key) are redacted automatically.

Standard event names (`lib/logging/events.ts`):

| Event | When |
|-------|------|
| `auth.signup` / `auth.login` | Authentication |
| `generation.*` / `video.*` | Job lifecycle |
| `credit.reserved` / `credit.consumed` / `credit.released` | Credit operations |
| `stripe.webhook` | Stripe events processed |
| `admin.action` | Admin mutations |
| `worker.started` / `worker.stopped` / `worker.heartbeat` | Workers |

Configure verbosity with `LOG_LEVEL=debug|info|warn|error`.

## Metrics

Lightweight in-memory counters/histograms in `lib/metrics/index.ts`:

- `generation_success_total`, `generation_failure_total`, `generation_duration`
- `video_success_total`, `video_failure_total`, `video_duration`
- `credit_reservation_total`, `credit_consumption_total`, `credit_refund_total`
- `stripe_webhook_total`, `stripe_webhook_failure_total`
- `worker_jobs_processed`, `worker_jobs_failed`, `worker_job_duration`

The abstraction is designed for future Prometheus/OpenTelemetry export. No external metrics server is required for local development.

## Sentry (optional)

Sentry is **disabled** when `SENTRY_DSN` is empty.

When configured:

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_ORG=your-org
SENTRY_PROJECT=atelier-ai
SENTRY_AUTH_TOKEN=...   # for source map upload in CI/deploy only
```

Files:

- `instrumentation.ts` — server init on startup
- `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`
- `lib/observability/sentry.ts` — `captureServerException()` for API errors

**Never sent to Sentry:** passwords, tokens, cookies, API keys, Stripe/Gemini secrets.

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Full status |
| `/api/health/live` | Process liveness |
| `/api/health/ready` | PostgreSQL, storage, worker readiness |

Health responses do not expose connection strings or secrets.

## Production monitoring checklist

- [ ] Log aggregation (CloudWatch, Datadog, etc.)
- [ ] Sentry alerts for unhandled API/worker errors
- [ ] Alert on `/api/health/ready` failures
- [ ] Monitor Stripe webhook failure rate via logs/metrics
- [ ] Track worker heartbeat staleness (`npm run workers:health`)

## Failure investigation

1. Find `X-Request-ID` from client response or logs
2. Search logs for `requestId` field
3. Cross-reference admin audit logs for admin actions
4. Check Sentry issue tags: `requestId`, `userId`, `route`, `jobId`
5. Verify credit ledger in PostgreSQL for billing/generation disputes

## Rollback considerations

- Sentry can be disabled instantly by clearing `SENTRY_DSN`
- Metrics are in-process only — no rollback needed
- Integration tests do not affect production data when `DATABASE_URL_TEST` is isolated
