# Step 19 — Execute GitHub Staging Certification

Step 19 runs the existing certification tooling on **GitHub Actions** because the local machine lacks Docker/PostgreSQL/Redis and provider credentials.

---

## 1. Push to GitHub

The project must be in a GitHub repository with Actions enabled.

```bash
cd /path/to/FahionAI
git init
git add .
git commit -m "Add staging certification workflow"
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

---

## 2. Configure Secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required for |
|--------|--------------|
| `STAGING_AWS_ACCESS_KEY_ID` | S3 validation |
| `STAGING_AWS_SECRET_ACCESS_KEY` | S3 validation |
| `STAGING_AWS_S3_BUCKET` | S3 validation |
| `STAGING_STRIPE_SECRET_KEY` | Stripe TEST (`sk_test_*` only) |
| `STAGING_STRIPE_WEBHOOK_SECRET` | Webhook validation |
| `STAGING_GEMINI_API_KEY` | Generation validation |

Optional: `STAGING_AWS_REGION`, `STAGING_STRIPE_*_PRICE_ID`

See `.env.staging.example` for mapping (never commit secret values).

---

## 3. Configure Variable (Soak)

**Settings → Secrets and variables → Actions → Variables**

| Variable | Value |
|----------|-------|
| `STAGING_BASE_URL` | `https://your-staging.example.com` |

Required for 24h soak and post-soak E2E against a **deployed** staging app.

---

## 4. Run Workflow

1. **Actions → Staging Certification → Run workflow**
2. First run: `run_soak = false` (core + providers if secrets configured)
3. After all pass: `run_soak = true` (requires `STAGING_BASE_URL` + deployed app)

---

## 5. Workflow Jobs

| Job | Requires secrets | Purpose |
|-----|------------------|---------|
| `certify-core` | No | Postgres, Redis, migrations, all tests, E2E |
| `certify-providers` | Yes (S3+Stripe+Gemini) | Real S3, Stripe, Gemini, workers |
| `certification-summary` | — | PASS/BLOCKED/NO-GO report |
| `certify-soak` | `run_soak=true` + `STAGING_BASE_URL` | 24h soak |
| `certification-summary-soak` | After soak success | Post-soak smoke + E2E |

---

## 6. Interpreting Results

### Core PASS (first milestone)

`certify-core` job green → infrastructure and application tests work in CI.

### Provider BLOCKED

`certify-providers` skipped + summary shows BLOCKED → add GitHub secrets.

### Provider PASS

`certify-providers` green → real S3/Stripe/Gemini validated.

### Final GO

Requires:

- `certify-core` PASS
- `certify-providers` PASS
- `certify-soak` PASS (24h)
- `certification-summary-soak` PASS
- Summary: `FINAL DECISION: GO`

Until then: **NO-GO**

---

## 7. Fixing Failures

For each failed job:

1. Open job logs in GitHub Actions
2. Identify root cause (application vs test vs infrastructure)
3. Fix in repository
4. Push fix
5. Re-dispatch workflow

Do not weaken tests or skip assertions.

---

## 8. Local CI Parity

Standard CI (`.github/workflows/ci.yml`) runs on push/PR with Postgres + Redis — same core tests without provider secrets.

---

## Related

- `docs/STEP_18_FINAL_REPORT.md` — prior NO-GO status
- `docs/GO_LIVE_CHECKLIST.md` — production checklist
- `docs/STAGING_PROVIDER_TESTING.md` — provider test details
