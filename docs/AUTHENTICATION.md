# Authentication

Atelier AI uses **Auth.js (NextAuth v5)** with JWT sessions and JSON user storage for local development.

## Architecture

```
Authentication (Auth.js)
        │
        ▼
      User (.data/users.json)
        │
   ┌────┴────┬──────────────┐
   ▼         ▼              ▼
Products  Photoshoots   Generation Jobs
   │         │              │
   └─────────┴──────────────┴──► Generated Assets
```

Every resource includes a `userId`. APIs derive the current user from the session — never from request body or URL parameters.

## Providers

| Provider | Status |
|----------|--------|
| Google OAuth | Primary |
| Email / password | Supported (bcrypt hashed) |

## Environment variables

Add to `.env.local`:

```env
AUTH_SECRET=generate_with_openssl_rand_base64_32
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Google OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application)
3. Authorized redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Copy Client ID and Client Secret to `.env.local`

## Local development

1. Set environment variables
2. Run `npm run dev`
3. Visit `/login`
4. Sign in with Google or create an email/password account at `/signup`

Run the generation worker separately as before — it processes jobs using stored `userId`, not browser sessions.

## Protected routes

Application routes require authentication (middleware redirect to `/login`):

- `/dashboard`, `/create`, `/products`, `/photoshoots`, `/generation`, `/videos`, `/templates`, `/credits`, `/settings`

Public routes:

- `/login`, `/signup`
- `/api/auth/*`
- `/api/health`

## API authorization

- Unauthenticated API requests → `401 Unauthorized`
- Access to another user's resource → `404 Not Found` (no information leak)
- Asset downloads via `/api/assets/...` require session + ownership lookup

## Data migration

Existing JSON records may lack `userId`. Run:

```bash
# Report orphaned records
npm run migrate:auth-data -- --report

# Assign to a development user (optional)
npm run migrate:auth-data -- --assign-user=<your-user-id>
```

The migration script never deletes data.

## Security model

Never trust:

- `userId` in request body
- `userId` in query parameters
- Client-supplied ownership fields

Always derive the user from `auth()` / `getCurrentUser()` on the server.

## Future compatibility

The user model supports future additions:

- Credits and subscriptions
- Teams and organizations
- Roles and API keys

These are not implemented in Step 6.
