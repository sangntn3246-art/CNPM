# OctaPoint

**Blockchain-Backed Credit-as-a-Service (CaaS) Platform** — Sui Move smart contracts,
a TypeScript API Gateway, a Developer SDK, an AI-ready MCP Server, and two admin/merchant
web portals.

This repository is a runnable **reference implementation / capstone deliverable**. It
implements the full request→gateway→ledger→(optional on-chain settlement) flow for real,
with an in-memory/SQLite "off-chain fast path" that mirrors what the Sui Move contract does
on-chain, so you can demo the whole product end-to-end on a laptop with `docker compose up`
and no cloud accounts.

```
octapoint/
├── contracts/octapoint/        Sui Move smart contract (Object-Centric credit model)
├── packages/
│   ├── api-gateway/            Hono + TypeScript core API (Postgres + Redis, HMAC, RBAC)
│   ├── sdk-ts/                 @octapoint/sdk — TypeScript client SDK
│   └── mcp-server/             OctaPoint MCP Server — exposes tools to AI agents
├── apps/
│   ├── merchant-portal/        Next.js — merchant self-service console
│   └── admin-portal/           Next.js — platform operator console
├── scripts/seed.ts             Seed demo merchant + users + a first credit issuance
└── docker-compose.yml          Postgres, Redis, API Gateway, MCP Server, both portals
```

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- API Gateway:      http://localhost:4000
- MCP Server (HTTP/SSE transport for testing): http://localhost:4100
- Merchant Portal:  http://localhost:3000
- Admin Portal:     http://localhost:3001

Or run pieces individually during development:

```bash
cd packages/api-gateway && npm install && npm run dev
cd packages/sdk-ts       && npm install && npm run build
cd packages/mcp-server   && npm install && npm run dev
cd apps/merchant-portal  && npm install && npm run dev
```

## What's real vs. simplified in this reference build

| Component | Status |
|---|---|
| Move smart contract (object model, capabilities, issue/redeem/transfer) | Full source, compiles with `sui move build` given the Sui CLI |
| API Gateway (Hono, Postgres/Prisma, Redis rate limiter, HMAC-SHA256 auth, RBAC, webhook dispatch) | Fully functional, runs locally |
| Anti-fraud engine (signature check, sliding-window rate limit, anomaly flags) | Functional, rule-based (production would add ML scoring) |
| On-chain settlement via `@mysten/sui` | Wired up behind `CHAIN_MODE=onchain`; defaults to `CHAIN_MODE=offchain` (fast-path ledger only) so the whole demo runs with zero blockchain setup. Flip the env var once you have a funded Sui Testnet address + Enoki API key. |
| Enoki zkLogin / sponsored transactions | Client wired up (`packages/api-gateway/src/services/enokiService.ts`) behind the same `onchain` flag — needs your own Enoki API key to actually sponsor gas |
| Walrus audit storage | Adapter with a local-disk fallback (`WALRUS_MODE=local`) and a real Walrus HTTP client (`WALRUS_MODE=walrus`) |
| Developer SDK (TypeScript) | Fully functional client against the gateway |
| MCP Server | Fully functional — 6 real tools, tested against the local gateway |
| Merchant + Admin portals | Functional Next.js apps (App Router) covering the core flows: onboarding, API keys, rule engine, transaction history, tenant/RBAC admin, infra monitoring |
| ClickHouse analytics, Stripe billing | Stubbed service classes with the correct interface + TODOs — swap in real API keys to activate; not required for the demo to run |

See each package's own README for details.
