# Step 32 — Railway Staging Infrastructure Provisioning

## Status: BLOCKED on Railway authentication

Railway CLI **v5.41.3** is installed, but `railway whoami` returns **Unauthorized**. No `~/.railway` token exists on this machine.

Provisioning cannot proceed until login succeeds **in this Terminal session**.

---

## Required action (one time on this machine)

```bash
railway login
railway whoami
```

Expected: your Railway account email/username (not "Unauthorized").

Then reply **“railway login done”** for Step 33 to continue.

---

## Planned provisioning (after auth)

See Step 31 architecture + `railway.toml`:

1. `railway list` — reuse existing FashionAI staging project if present
2. Else `railway init` → project `fashionAI-staging`
3. `railway add --database postgres`
4. `railway add --database redis`
5. Web service from `flyerdesigns/fashionAI` (uses `railway.toml`)
6. Two worker services: `npm run worker:image`, `npm run worker:video`
7. Shared env vars from `.env.staging.example`
8. `railway domain` → HTTPS URL → `STAGING_BASE_URL`
9. Migrations + Playwright seed against Railway Postgres
10. S3 / Stripe TEST / Gemini (when credentials available)
11. `gh secret set` + `gh variable set STAGING_BASE_URL`
12. Staging certification `run_soak=false` (only when all providers configured)

**Do not run `run_soak=true` in Step 32.**

See `docs/STEP_31.md` for full env var and service layout.
