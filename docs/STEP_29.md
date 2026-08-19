# Step 29 — Enable Authenticated GitHub Actions Certification

Enable `gh` authentication so Staging Certification can be dispatched and monitored.

## Completed in Step 29

- Installed GitHub CLI: `brew install gh` → **gh 2.97.0**
- Verified `gh auth status` → not logged in
- Confirmed git uses `osxkeychain` for HTTPS (separate from `gh` auth)

## Blocked — user action required

### 1. Authenticate GitHub CLI

In Terminal:

```bash
gh auth login
```

| Prompt | Choose |
|--------|--------|
| Account | GitHub.com |
| Protocol | HTTPS |
| Auth method | **Login with a web browser** |

Do **not** paste a PAT into chat. Complete the browser/device-code flow GitHub shows.

Verify:

```bash
gh auth status
gh repo view flyerdesigns/fashionAI
```

### 2. Push Step 28 docs (if not pushed)

```bash
cd /Users/zeel/FahionAI
git push origin main
```

Commit `0b62c4e` — Step 28 documentation only.

### 3. Verify workflow

```bash
gh workflow list --repo flyerdesigns/fashionAI
```

Confirm **Staging Certification** (`staging-certification.yml`) with `run_soak` input.

### 4. Dispatch staging certification

```bash
gh workflow run staging-certification.yml \
  --repo flyerdesigns/fashionAI \
  --ref main \
  -f run_soak=false
```

Get run ID:

```bash
gh run list --workflow=staging-certification.yml --repo flyerdesigns/fashionAI --limit 1
```

Monitor:

```bash
gh run watch <RUN_ID> --repo flyerdesigns/fashionAI
```

## After dispatch

Share the workflow run URL to update `docs/STEP_29_FINAL_REPORT.md` with verified job results.

See `docs/STEP_29_FINAL_REPORT.md` for current gate status.
