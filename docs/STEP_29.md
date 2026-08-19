# Step 29 — Enable Authenticated GitHub Actions Certification

Enable `gh` authentication so Staging Certification can be dispatched and monitored.

## Completed in Step 29

- Installed GitHub CLI: `brew install gh` → **gh 2.97.0**
- Verified `gh auth status` → not logged in
- Confirmed git uses `osxkeychain` for HTTPS (separate from `gh` auth)

## Blocked — completed

Authentication and first staging certification dispatch completed in Step 29.

See `docs/STEP_29_FINAL_REPORT.md` for verified run **32249216663** (`certify-core` **PASS**).

## Re-dispatch (optional, after `a5889c0`)

```bash
gh workflow run staging-certification.yml \
  --repo flyerdesigns/fashionAI \
  --ref main \
  -f run_soak=false
```

## After dispatch

Share the workflow run URL to update `docs/STEP_29_FINAL_REPORT.md` with verified job results.

See `docs/STEP_29_FINAL_REPORT.md` for current gate status.
