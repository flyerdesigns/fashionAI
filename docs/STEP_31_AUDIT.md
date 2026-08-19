# Step 31 Audit — Staging Host Provisioning

**Date:** 2026-08-19  
**Commit:** `c3f900e`

---

## Section 1 — Hosting path

| Platform | CLI | Auth |
|----------|-----|------|
| Railway | Not installed | **Not authenticated** |
| Render | Not installed | **Not authenticated** |
| Fly.io | Not installed | **Not authenticated** |
| AWS | Not installed | **Not authenticated** |
| Vercel | Not installed | **Not authenticated** |
| **GitHub (`gh`)** | Installed | **Authenticated** — `flyerdesigns` |

**Selected platform:** **Railway** (recommended; simplest for web + 2 workers + Postgres + Redis)  
**Status:** **BLOCKED** — `railway login` required (browser interaction)

## Section 2 — Deployment manifest added

| File | Purpose |
|------|---------|
| `railway.toml` | Web service build/start + `/api/health/live` healthcheck |

Workers use the same repo with per-service start commands (documented in `docs/STEP_31.md`).

No Dockerfile (Nixpacks builds Node directly).

## Sections 3–14 — Provisioning

All **NOT RUN** — no hosting authentication, no external credentials.

| Component | Status |
|-----------|--------|
| PostgreSQL | BLOCKED |
| Redis | BLOCKED |
| Web | BLOCKED |
| Image worker | BLOCKED |
| Video worker | BLOCKED |
| S3 | BLOCKED |
| Stripe TEST | BLOCKED |
| Gemini | BLOCKED |
| GitHub `STAGING_*` secrets | Empty |
| `STAGING_BASE_URL` | Not set |
| Staging certification (providers) | Not dispatched |

## Application changes

**None.** Only `railway.toml` added.
