# Generation Worker (Local Development)

Atelier AI uses an **async generation job system**. The Next.js API creates jobs immediately; a separate worker process executes them.

## Quick start

Run **two terminals**:

```bash
# Terminal 1 — web app
npm run dev

# Terminal 2 — generation worker
npm run worker:generation
```

Ensure `.env.local` includes:

```env
GEMINI_API_KEY=your_key_here
DEFAULT_IMAGE_PROVIDER=gemini
```

## How it works

1. User clicks **Generate Photos**
2. `POST /api/generate/photoshoot` creates a photoshoot + job (status: `queued`) and returns `{ jobId, photoshootId }` immediately
3. The worker polls `.data/generation-jobs.json` every 2 seconds
4. `GenerationWorker.process(jobId)` generates **one image at a time**
5. The browser polls `GET /api/generation/[jobId]` and shows live thumbnails
6. When complete, the user is redirected to `/photoshoots/[id]`

## Job storage

| File | Purpose |
|------|---------|
| `.data/generation-jobs.json` | Generation jobs + per-image status |
| `.data/generation-idempotency.json` | Duplicate request protection |
| `.data/photoshoots.json` | Photoshoot records (updated incrementally) |

## Production recommendation

Replace the polling script with a **durable queue**:

- **Redis + BullMQ** — popular for Node.js workers
- **AWS SQS + Lambda/ECS worker**
- **Google Cloud Tasks**
- **Inngest / Trigger.dev** — managed job runners

The worker entry point stays the same:

```typescript
import { generationWorker } from "@/lib/generation/worker";

// Queue consumer handler:
await generationWorker.process(jobId);
```

Do **not** run long-running generation inside Next.js API route handlers in production.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GENERATION_IMAGE_TIMEOUT_MS` | `120000` | Per-image provider timeout |
| `GENERATION_WORKER_POLL_MS` | `2000` | Worker poll interval |
| `GENERATION_MAX_CONCURRENCY` | `1` | Images processed in parallel (MVP: 1) |

## Recovering after refresh

Open `/generation/[jobId]` to resume polling. Generation continues even if the browser is closed, as long as the worker process is running.
