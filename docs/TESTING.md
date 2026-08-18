# Testing

## Framework

Atelier AI uses **Vitest** for automated tests.

```bash
npm run test           # run once
npm run test:watch     # watch mode
npm run test:integration  # requires DATABASE_URL_TEST
npm run test:security
npm run test:smoke
```

See `docs/E2E_TESTING.md`, `docs/INTEGRATION_TESTING.md`, and `docs/STEP_14.md`.

## Structure

```
tests/
  unit/       — pure functions, config, error mappers
  credits/    — pricing, reservation logic
  storage/    — key parsing, ownership helpers
```

## Mocking Policy

Tests **must not** call real external APIs:

- Gemini / Gemini Veo — not called in unit tests
- Stripe — webhook tests should mock signature verification separately (integration)
- AWS S3 — not called in unit tests
- PostgreSQL — integration tests optional; unit tests use pure logic

## Manual Testing

Production flows requiring credentials:

- Stripe checkout + webhook (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- Gemini image generation (requires `GEMINI_API_KEY` + worker)
- Gemini Veo video generation (requires API key + video worker)

## CI Recommendation

```bash
npm run lint
npm run test
npm run build
npx prisma validate
```
