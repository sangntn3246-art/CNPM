# OctaPoint Professional UI Upgrade

This build keeps the existing API, database, Redis, SDK, MCP, and demo bootstrap logic intact while upgrading both web portals.

## Merchant Console
- Responsive enterprise SaaS shell with active navigation.
- Four KPI cards including outstanding balance.
- Recent activity table, credit-volume breakdown, and operational status.
- Redesigned campaign creation and campaign status cards.
- Safer API-key presentation with one-time secret callout, copy actions, masked IDs, and status badges.
- Transaction summary, user search, and type filters.

## Operator Console
- Responsive dark control-plane shell with active navigation.
- Platform KPI cards and merchant directory.
- Improved status badges and merchant controls.
- Infrastructure health cards, topology view, off-chain disclosure, Sui network status, and Enoki readiness.

## Runtime note
The local demo remains in `CHAIN_MODE=offchain` unless real Sui package/object IDs and credentials are supplied. The API Gateway Dockerfile includes OpenSSL for Prisma on Alpine.
