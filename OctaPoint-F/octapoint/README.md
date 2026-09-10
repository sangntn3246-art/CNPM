# OctaPoint

**Blockchain-Backed Credit-as-a-Service (CaaS) Platform** with a Sui Move contract, TypeScript API Gateway, TypeScript SDK, MCP Server, Merchant Portal, and Admin Portal.

This repository is a **capstone/reference implementation** designed to run locally in `CHAIN_MODE=offchain` with PostgreSQL + Redis. The Sui/Enoki/Walrus integrations are kept as optional integration paths and require real external credentials/object IDs before they can be demonstrated against testnet.

## Project structure

```text
octapoint/
├── contracts/octapoint/        Sui Move credit contract
├── packages/
│   ├── api-gateway/            Hono + Prisma/PostgreSQL + Redis
│   ├── sdk-ts/                 @octapoint/sdk TypeScript SDK
│   └── mcp-server/             MCP tools for AI agents
├── apps/
│   ├── merchant-portal/        Next.js merchant portal
│   └── admin-portal/           Next.js operator portal
├── scripts/
│   ├── bootstrap-demo.mjs      Deterministic local demo bootstrap
│   └── static-check.mjs        Dependency-free source sanity check
├── RUN_WINDOWS.md              Beginner-friendly Windows/VS Code instructions
└── docker-compose.yml          Local stack
```

## Quick start (recommended)

The ZIP already contains a local-only `.env` with fixed demo credentials. They are intentionally non-production values.

```bash
docker compose up --build
```

Docker Compose automatically creates a demo merchant, API key, and sample transactions.

Open:

- Merchant Portal: http://localhost:3000
- Admin Portal: http://localhost:3001
- API health: http://localhost:4000/health
- MCP health: http://localhost:4100/health

Demo data:

- Merchant ID: `00000000-0000-4000-8000-000000000001`
- Demo user: `demo_user_1`
- Starting demo flow: issue 500 → redeem 120 → balance 380

For Windows/VS Code instructions, read `RUN_WINDOWS.md`.

## Local development without Docker

You need Node.js, PostgreSQL, and Redis running locally.

```bash
cp .env.example .env
npm install
npm run build:all
npm run check:static
```

Then initialize Prisma and start the services individually.

## Implemented in the local demo

| Component | Local demo status |
|---|---|
| PostgreSQL/Prisma ledger | Implemented |
| Redis balance cache | Implemented |
| HMAC-SHA256 API authentication | Implemented |
| API secrets encrypted with AES-256-GCM | Implemented |
| Replay protection | Implemented |
| Fixed-window rate limiting + issuance anomaly flag | Implemented |
| Issue / redeem / balance / history | Implemented |
| Idempotency via unique request ID | Implemented |
| Webhook signing | Implemented; webhook secret encrypted at rest |
| Merchant portal | Implemented for core demo flows |
| Admin portal | Implemented for core demo/operator flows |
| TypeScript SDK | Implemented |
| MCP Server | Implemented; configured with the deterministic demo credential |
| Local audit store | Implemented |
| Sui Move contract source | Included |

## External / testnet integrations

`CHAIN_MODE=offchain` is the supported default for the one-click local demo.

To use `CHAIN_MODE=onchain`, you still need to deploy the Move package, configure the real package/capability/treasury/account object IDs, fund/configure the signer, and verify the chosen Sui/Enoki integration flow. Do not enable `CHAIN_MODE=onchain` using empty IDs.

Walrus testnet mode likewise requires the selected publisher endpoint to be reachable. Stripe and production-grade ClickHouse analytics are not required by the local demo and are not represented here as production-complete integrations.

## Important security note

The included `.env` and `DEMO_MODE=true` are only for a local classroom/demo environment. Before any real deployment:

- set `DEMO_MODE=false`;
- replace all fixed tokens/secrets;
- restrict CORS;
- add real portal authentication/authorization;
- do not expose admin tokens through browser environment variables;
- use a proper secret manager and key rotation policy.
