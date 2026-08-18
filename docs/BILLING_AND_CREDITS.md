# Billing & Credits

Step 8 adds credit metering and Stripe subscription billing to Atelier AI.

## Credit Architecture

```
User
  ↓
CreditAccount (balance, reserved, lifetime*)
  ↓
Generation request
  ↓
CreditReservation (atomic)
  ↓
GenerationJob / Worker
  ↓
Success → consume reserved credits
Failure → release reserved credits
Partial failure → consume successful + release failed
```

### Amount Convention

- **Positive** transaction amounts increase available balance (grants, refunds)
- **Negative** transaction amounts decrease available balance (reservations recorded as negative on balance)
- `balance` = available credits
- `reserved` = credits held for in-flight generation jobs
- `available` = `balance` (same value exposed to UI)

## Credit Lifecycle

1. **Signup** — `CreditAccount` created with optional signup bonus (default 100, configurable)
2. **Subscription** — monthly credits granted on `invoice.paid` (authoritative)
3. **Generation** — credits reserved before job creation
4. **Worker completion** — reservation settled (consume + refund partial failures)
5. **Cancellation** — queued jobs release all reserved credits

## Plans

Configured in `lib/billing/plans.ts`:

| Plan | Monthly Credits | Stripe Price Env |
|------|-----------------|------------------|
| Free | 0 (signup bonus only) | — |
| Starter | 500 | `STRIPE_STARTER_PRICE_ID` |
| Pro | 1,500 | `STRIPE_PRO_PRICE_ID` |
| Business | 5,000 | `STRIPE_BUSINESS_PRICE_ID` |

## Generation Costs

Configured in `lib/credits/config.ts`:

| Env | Default |
|-----|---------|
| `CREDITS_SIGNUP_BONUS` | 100 |
| `CREDITS_PER_IMAGE` | 5 |
| `CREDITS_PER_REGENERATION` | 5 |
| `CREDITS_PER_RETRY` | 5 |

## Stripe Setup

1. Create products/prices in Stripe **test mode**
2. Set environment variables (see `.env.example`)
3. Configure webhook endpoint: `POST /api/stripe/webhook`
4. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### Authoritative Credit Grant

**Monthly credits are granted on `invoice.paid`**, not on checkout redirect.

Idempotency key: `subscription:{subscriptionId}:{periodStart}`

Duplicate webhook events are ignored via `StripeEvent.stripeEventId` uniqueness.

## Local Webhook Testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/credits` | GET | Balance (available, reserved) |
| `/api/credits/transactions` | GET | Paginated credit ledger |
| `/api/credits/usage` | GET | Paginated usage history |
| `/api/billing/checkout` | POST | Create Stripe Checkout session |
| `/api/billing/subscription` | GET | Current subscription |
| `/api/billing/portal` | POST | Stripe Customer Portal |
| `/api/stripe/webhook` | POST | Stripe webhooks (unsigned auth bypass) |

## Migration

```bash
npx prisma migrate deploy
npm run migrate:credit-accounts -- --dry-run
npm run migrate:credit-accounts -- --execute
```

Existing users: accounts created with **zero balance** unless `MIGRATE_CREDIT_SIGNUP_BONUS=true`.

Existing generation jobs without reservations are **not** retroactively charged.

## Recovery

```bash
npm run recover:credit-reservations -- --dry-run
npm run recover:credit-reservations -- --execute
```

Releases reservations older than `CREDIT_RESERVATION_TIMEOUT_MS` (default 2 hours).

## Cancellation Policy

- Cancel at period end via Stripe Customer Portal
- Remaining subscription credits stay available until used
- Future monthly grants stop when subscription is canceled/unpaid

## Failure Behavior

| Scenario | Behavior |
|----------|----------|
| Insufficient credits | 402 error, job not created |
| Reservation succeeds, job creation fails | Job cleaned up; reservation released |
| Gemini failure | Failed image credits refunded on settlement |
| Partial failure (3/4 succeed) | 15 consumed, 5 released |
| Job cancelled while queued | All reserved credits released |
| Duplicate Stripe webhook | Ignored via `StripeEvent` idempotency |

## Security

- Never accept `userId`, `stripePriceId`, or amounts from the frontend
- Frontend sends plan id only (`"pro"`)
- Stripe secrets are server-side only
- All credit/billing routes require authentication except webhook
