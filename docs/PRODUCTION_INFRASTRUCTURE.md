# Production Infrastructure — PostgreSQL + AWS S3

Step 7 moves Atelier AI from JSON files and local filesystem storage to PostgreSQL (via Prisma) and AWS S3 for production.

## Architecture

```
Next.js App
    ↓
Repository Factory (DATABASE_PROVIDER)
    ├── json (development fallback)
    └── postgres (production)

Storage Factory (STORAGE_PROVIDER)
    ├── local → .data/uploads/
    └── s3 → private AWS bucket

/api/assets/[...path] → authenticated streaming (no public S3 URLs)
```

## Environment Variables

Add to your `.env` (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_PROVIDER` | `json` (default) or `postgres` |
| `STORAGE_PROVIDER` | `local` (default) or `s3` |
| `DATABASE_URL` | PostgreSQL connection string |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret (server-side only) |
| `AWS_S3_BUCKET` | Private bucket name |
| `AWS_ENDPOINT` | Optional (MinIO, LocalStack) |
| `AWS_S3_FORCE_PATH_STYLE` | `true` for path-style endpoints |

**Never** expose AWS or database credentials to the browser. Do not use `NEXT_PUBLIC_` prefixes for secrets.

## PostgreSQL Setup

1. Provision PostgreSQL (RDS, Neon, Supabase, local Docker, etc.).
2. Set `DATABASE_URL`:
   ```
   postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Apply migrations (never use `prisma migrate reset` on production data):
   ```bash
   npx prisma migrate deploy
   ```
   For local development:
   ```bash
   npx prisma migrate dev
   ```

## Prisma Schema

Models: `User`, `Product`, `Photoshoot`, `GenerationJob`, `GenerationImage`

- User → Products (one-to-many, `onDelete: Restrict`)
- User → Photoshoots → GenerationJobs → GenerationImages
- `GenerationJob.requestId` is unique for idempotency
- `GenerationJob.lockedAt` / `lockedBy` for worker job claiming
- Generated images stored in `GenerationImage` table (not embedded JSON)

## AWS S3 Setup

1. Create a **private** S3 bucket.
2. Create an IAM user or role with minimum permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    }
  ]
}
```

3. Set `STORAGE_PROVIDER=s3` and AWS env vars.

### S3 Object Key Structure

```
users/{userId}/products/{productId}/original/{filename}
users/{userId}/photoshoots/{photoshootId}/generated/{imageId}.png
```

Legacy local keys (`products/...`, `generated/...`) are remapped during migration.

## Switching Providers

### Production

```env
DATABASE_PROVIDER=postgres
STORAGE_PROVIDER=s3
DATABASE_URL=postgresql://...
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket
```

### Local Development (default)

```env
DATABASE_PROVIDER=json
STORAGE_PROVIDER=local
```

JSON repositories and `.data/` remain available for development. Do not delete `.data/` until migration is verified.

## Migration

### 1. Migrate JSON → PostgreSQL

```bash
# Preview (no writes)
npm run migrate:json-to-postgres -- --dry-run

# Execute
npm run migrate:json-to-postgres -- --execute
```

Preserves IDs, timestamps, and relationships. Skips duplicate emails.

### 2. Migrate Local Files → S3

```bash
npm run migrate:storage-to-s3 -- --dry-run
npm run migrate:storage-to-s3 -- --execute
```

Uploads local files, updates PostgreSQL storage keys. Does **not** delete local files.

### 3. Verify

```bash
npm run verify:production-data
npm run compare:json-postgres
```

### 4. Compare JSON vs PostgreSQL

```bash
npm run compare:json-postgres
```

## Rollback

To temporarily revert:

```env
DATABASE_PROVIDER=json
STORAGE_PROVIDER=local
```

Restart the app and worker. `.data/` is preserved.

## Worker

The generation worker uses the same repository and storage factories:

```bash
npm run worker:generation
```

With `DATABASE_PROVIDER=postgres`, jobs are claimed atomically via `lockedAt` / `lockedBy` to prevent duplicate processing.

## Asset Authorization

`/api/assets/...` continues to:

1. Authenticate the user
2. Resolve ownership via product `originalImageKey` or generation image `storageKey`
3. Stream the object from local storage or S3

Users cannot access another user's assets by guessing paths.

## Product Deletion

Products with existing photoshoots **cannot** be deleted (409). This protects generated campaign assets. Delete or archive photoshoots first.

## Orphan Detection

`lib/storage/cleanup.ts` identifies storage objects not referenced in the database. It does not auto-delete anything.

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npx prisma generate` | Generate Prisma client |
| `npx prisma migrate deploy` | Apply migrations (production) |
| `npm run migrate:json-to-postgres` | JSON → PostgreSQL |
| `npm run migrate:storage-to-s3` | Local → S3 |
| `npm run verify:production-data` | Validate relationships + storage |
| `npm run compare:json-postgres` | Count comparison |
| `npm run worker:generation` | Run generation worker |
