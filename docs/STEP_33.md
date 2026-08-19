# Step 33 — Railway Staging Deployment

## Status: STOPPED at Phase 1

`railway whoami` returns **Unauthorized**.

The `~/.railway/` directory exists but contains only `version.json` — no login token. A partial CLI setup or interrupted login does not count as authenticated.

---

## Required user action

Run in Terminal:

```bash
cd /Users/zeel/FahionAI
railway login
railway whoami
```

**Success criteria:** `whoami` prints your Railway account (email/username), not `Unauthorized`.

Then:

```bash
railway list
```

Reply **“railway login done”** when both succeed.

---

## What Step 33 will do after auth

1. `railway list` — reuse or create `fashionAI-staging`
2. Add Postgres + Redis (if missing)
3. Deploy web + image worker + video worker from `flyerdesigns/fashionAI` `main`
4. Configure env from `.env.staging.example`
5. `prisma migrate deploy` + `seed:playwright`
6. Verify health, smoke, workers
7. Configure GitHub secrets (when S3/Stripe/Gemini credentials exist)
8. Dispatch Staging Certification `run_soak=false` (only when all providers ready)

See `docs/STEP_31.md` for architecture details.

**Do not run 24h soak in Step 33.**
