# Step 27 Audit — GitHub Staging Core Certification

**Date:** 2026-08-19  
**Commit (audit start):** `43a1d0b` — Fix billing plans rendering by resolving Stripe prices on server.

---

## Repository inspection

| Check | Result |
|-------|--------|
| `git status` | Clean working tree |
| Branch | `main` tracking `origin/main` |
| HEAD | `43a1d0b` (matches `origin/main` at audit start) |
| Remote | `https://github.com/flyerdesigns/fashionAI.git` |
| CI #11 (known) | **PASS** — full green on `43a1d0b` |

## CI vs staging certification

| Aspect | `ci.yml` | `staging-certification.yml` (`certify-core`) |
|--------|----------|-----------------------------------------------|
| Trigger | push/PR | `workflow_dispatch` only |
| Postgres + Redis services | Yes | Yes |
| Rate limit | `memory` | `redis` |
| Queue | default (`local`) | `bullmq` |
| Extra steps | — | `probe:infrastructure`, `validate:database`, `staging:smoke` |
| `verify:production` | `VERIFY_RUN_TESTS=false` | `VERIFY_RUN_TESTS=true` |
| Staging certification runs | N/A | **0 runs** at audit start |

## Workflow structural review

**Valid:** Five jobs (`certify-core`, `certify-providers`, `certification-summary`, `certify-soak`, `certification-summary-soak`) with correct `needs` graph and `run_soak=false` skipping soak jobs.

**Issue found (pre-dispatch):** `staging:smoke` ran **after** Playwright E2E. Playwright stops its `webServer` when tests finish, so `staging:smoke` HTTP checks against `http://localhost:3000` would fail even when E2E passed.

**Fix applied:** Start `npm run start` once after seed; wait for `/api/health/live`; run `staging:smoke`; run Playwright with `PLAYWRIGHT_SKIP_WEBSERVER=true`.

**Not modified:** `ci.yml` (green, unchanged).

## Dispatch capability

| Tool | Status |
|------|--------|
| `gh` CLI | Not installed |
| `GITHUB_TOKEN` / `GH_TOKEN` | Not set in environment |
| GitHub REST API (unauthenticated) | Rate limited (403) |

**Conclusion:** Workflow dispatch must be triggered manually via GitHub UI (or after installing/authenticating `gh`).

## Expected outcome with `run_soak=false` and no provider secrets

| Job | Expected |
|-----|----------|
| `certify-core` | **PASS** (after smoke/server fix) |
| `certify-providers` | **FAIL** (empty `STAGING_*` secrets) |
| `certification-summary` | **NO-GO** — providers BLOCKED |
| `certify-soak` | **Skipped** |
| `certification-summary-soak` | **Skipped** |

Provider-dependent items remain honestly **BLOCKED**: S3, Stripe TEST, Gemini/Veo, real workers, deployed URL, 24h soak.
