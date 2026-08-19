# STEP 31 — STAGING HOST PROVISIONING

**Date:** 2026-08-19

---

## Repository

| Item | Value |
|------|-------|
| URL | https://github.com/flyerdesigns/fashionAI |
| Commit | `c3f900e` (pre–Step 31 manifest); manifest commit pending push |

---

## Hosting Platform

| Item | Value |
|------|-------|
| **Selected** | **Railway** (recommended) |
| **Deployment Status** | **BLOCKED** — Railway CLI not installed; not authenticated |

---

## Infrastructure

| Component | Status |
|-----------|--------|
| Web | **BLOCKED** |
| Image Worker | **BLOCKED** |
| Video Worker | **BLOCKED** |
| PostgreSQL | **BLOCKED** |
| Redis | **BLOCKED** |
| S3 | **BLOCKED** |
| Stripe TEST | **BLOCKED** |
| Gemini/Veo | **BLOCKED** |

### STAGING_BASE_URL

**BLOCKED** — not configured

---

## Validation

| Check | Status |
|-------|--------|
| Database | **BLOCKED** |
| Redis | **BLOCKED** |
| Migrations | **BLOCKED** |
| Playwright Seed | **BLOCKED** |
| Staging Smoke | **BLOCKED** |
| Worker Health | **BLOCKED** |

---

## Certification

| Gate | Status |
|------|--------|
| Core Certification | **PASS** (Step 29 run [32249216663](https://github.com/flyerdesigns/fashionAI/actions/runs/32249216663)) |
| Provider Certification | **BLOCKED** |
| S3 Verification | **BLOCKED** |
| Stripe Verification | **BLOCKED** |
| Gemini Verification | **BLOCKED** |
| Deployed Playwright | **BLOCKED** |
| Production Verification (real providers) | **BLOCKED** |
| 24h Soak | **NOT RUN** |
| Post-Soak E2E | **NOT RUN** |

No new certification dispatch in Step 31.

---

## Progress in Step 31

| Item | Status |
|------|--------|
| `railway.toml` added | Web build/start + healthcheck |
| `docs/STEP_31.md` | Railway provisioning runbook |
| Application code | **Unchanged** |
| Tests / CI | **Unchanged** |

---

## Issues

| Severity | Issue |
|----------|-------|
| **Critical** | No Railway (or other host) authentication — cannot provision |
| **High** | No S3, Stripe TEST, Gemini, or GitHub staging secrets |
| **Medium** | External provider accounts required (AWS, Stripe, Google) |
| **Low** | — |

---

## FINAL DECISION: **NO-GO**

---

## COMPLETED

- Verified no hosting platform CLI is authenticated (Railway, Render, Fly, AWS, Vercel)
- Confirmed `gh` authenticated as `flyerdesigns`
- Confirmed GitHub `STAGING_*` secrets and `STAGING_BASE_URL` still empty
- Added minimum Railway deployment manifest (`railway.toml`)
- Documented Railway 3-service + Postgres + Redis architecture in `docs/STEP_31.md`
- Step 29 core certification remains **PASS**

## BLOCKED — USER ACTION REQUIRED

1. **Install and log in to Railway:**
   ```bash
   brew install railway
   railway login
   railway whoami
   ```
2. **Create Railway project** with Postgres + Redis plugins and three services (web, image worker, video worker) — see `docs/STEP_31.md`
3. **Provision private S3 bucket** + IAM credentials (staging only)
4. **Configure Stripe TEST** (`sk_test_*`, Price IDs, webhook to staging URL)
5. **Obtain Gemini staging API key**
6. **Set env vars** on Railway services (never commit secrets)
7. **Run migrations + Playwright seed** on staging database
8. **Configure GitHub secrets/variable** via `gh secret set` / `gh variable set`
9. **Verify** smoke + workers + provider scripts
10. **Dispatch** Staging Certification with `run_soak=false`

## FAILURES REQUIRING CODE CHANGES

**None** — provisioning blocked on hosting authentication and external accounts, not application defects.

## NEXT EXACT ACTION

Run in Terminal:

```bash
brew install railway
railway login
```

Reply **“railway login done”** when authenticated, and Step 32 can create the Railway project, link the repo, and begin service deployment.

**Do not run `run_soak=true` until provider certification passes on a live staging URL.**
