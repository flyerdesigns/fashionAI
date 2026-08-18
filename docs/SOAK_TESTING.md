# Soak Testing

The soak test monitors staging/production stability over time without expensive continuous AI generation.

## Usage

```bash
SOAK_DURATION_HOURS=24 SOAK_INTERVAL_SECONDS=60 npm run soak:test
```

Optional target:

```bash
STAGING_BASE_URL=https://staging.example.com SOAK_DURATION_HOURS=1 SOAK_INTERVAL_SECONDS=30 npm run soak:test
```

## Default Behavior (Safe)

Every interval:
- `GET /api/health/live`
- Readiness check via `getReadinessCheck()`
- Worker heartbeat freshness (PostgreSQL)
- **No** continuous image/video generation

## Optional

```bash
SOAK_RUN_GENERATION_CHECK=true
```

Only pings `/api/health/ready` — does not create generation jobs.

## Output

JSON summary with:
- `checks` — total iterations
- `healthFailures`
- `workerStaleEvents`
- `apiErrors`
- `warnings[]` — timestamped events

Exit code `1` if health failures or excessive API errors.

## Recommended Before Go-Live

Run 24h soak on staging with workers active:

```bash
# Terminal 1: web
npm run start

# Terminal 2-3: workers
npm run worker:image
npm run worker:video

# Terminal 4: soak
SOAK_DURATION_HOURS=24 npm run soak:test
```

Review summary before promoting to production.
