# @octapoint/api-gateway

Hono + TypeScript API Gateway — the core credit ledger, anti-fraud engine,
and merchant/admin control plane.

## Run locally

```bash
npm install
npx prisma generate
npx prisma db push   # requires DATABASE_URL pointing at a running Postgres
npm run dev
```

Requires Postgres and Redis — easiest via the root `docker-compose.yml`, or
point `DATABASE_URL` / `REDIS_URL` at your own instances.

## Auth model

- `/merchants/*` — onboarding & key management (session-authed in
  production; open in this reference build).
- `/credits/*` — requires HMAC-SHA256 request signing
  (see `src/middleware/hmac.ts`) + is rate-limited per merchant.
- `/admin/*` — requires `Authorization: Bearer $ADMIN_TOKEN`.

## Anti-fraud

- `middleware/hmac.ts` — signature + timestamp + nonce replay protection.
- `middleware/rateLimit.ts` — Redis sliding/fixed-window limiter +
  anomalous-issuance-volume flag.
