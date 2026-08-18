# Video Generation

Step 9 adds premium AI fashion video generation to Atelier AI.

## Architecture

```
UI (/videos/create)
  ↓
POST /api/generate/video
  ↓
VideoService
  ↓
Credit reservation
  ↓
Video + VideoGenerationJob (PostgreSQL)
  ↓
Video Worker (npm run worker:video)
  ↓
Video Provider Factory
  ↓
Gemini Veo (default)
  ↓
S3 / local storage
  ↓
Credit settlement
```

## Provider Architecture

Providers implement `VideoGenerationProvider` in `lib/video/providers/types.ts`:

- `generateVideo()`
- `getGenerationStatus()`
- `cancelGeneration()`

Default provider: **Gemini Veo** via `@google/genai` (`models.generateVideos`).

Set `VIDEO_PROVIDER=gemini_veo` and configure an API key.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VIDEO_PROVIDER` | `gemini_veo` | Provider identifier |
| `VIDEO_PROVIDER_API_KEY` | — | Dedicated video API key (falls back to `GEMINI_API_KEY`) |
| `GEMINI_VIDEO_MODEL` | `veo-2.0-generate-001` | Veo model ID |
| `VIDEO_GENERATION_TIMEOUT_MS` | `600000` | Max wait for provider |
| `VIDEO_WORKER_POLL_MS` | `3000` | Worker poll interval |
| `VIDEO_PROVIDER_POLL_MS` | `10000` | Provider operation poll interval |
| `CREDITS_VIDEO_5_SEC` | `25` | Credits for 5s video |
| `CREDITS_VIDEO_10_SEC` | `40` | Credits for 10s video |
| `CREDITS_VIDEO_15_SEC` | `60` | Credits for 15s video |

## Credit Flow

1. **Pre-check** — available credits >= duration cost
2. **Reserve** — atomic reservation linked to `VideoGenerationJob`
3. **Worker success** — consume reserved credits
4. **Worker failure / cancel** — release reserved credits

Video generation requires `DATABASE_PROVIDER=postgres`.

## Storage

Videos stored at:

```
users/{userId}/videos/{videoId}/video.mp4
users/{userId}/videos/{videoId}/thumbnail.jpg
```

Served privately via `/api/assets/...` with ownership checks.

## Running the Video Worker

In a separate terminal:

```bash
npm run worker:video
```

Requires:

- `DATABASE_PROVIDER=postgres`
- `DATABASE_URL` set
- `GEMINI_API_KEY` or `VIDEO_PROVIDER_API_KEY`
- Storage configured (`STORAGE_PROVIDER=local` or `s3`)

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/generate/video` | POST | Create video job (202) |
| `/api/videos` | GET | List user videos |
| `/api/video/[id]` | GET/DELETE | Get or delete video |
| `/api/video/jobs/[jobId]` | GET | Job status |
| `/api/video/jobs/[jobId]/cancel` | POST | Cancel queued/processing job |
| `/api/video/jobs/[jobId]/retry` | POST | Retry failed video |

## Database Models

- **Video** — video metadata and result
- **VideoGenerationJob** — async job queue with locking

Migration: `prisma/migrations/20260318220000_video_generation/`

Apply with:

```bash
npx prisma migrate deploy
npx prisma generate
```

## UI Pages

- `/videos` — video library
- `/videos/create` — multi-step creation wizard
- `/videos/[id]` — video player and metadata
- `/video-generation/[jobId]` — progress page

## Limitations

- Requires PostgreSQL (no JSON fallback for video jobs)
- Provider must be configured — no fake/mock videos
- Veo cancellation not supported via SDK (job can still be marked cancelled locally)
- Single provider implementation in v1 (architecture supports more)
- Image generation flow unchanged

## Local Testing

1. Set `DATABASE_PROVIDER=postgres` and `GEMINI_API_KEY`
2. Run `npm run dev`
3. Run `npm run worker:video` in another terminal
4. Complete a photoshoot to get source images
5. Go to `/videos/create` and generate a video

If the provider is not configured, the API returns:
`Video generation provider is not configured.`
