# OctaPoint Final Review Notes

This package remains based on the supplied OctaPoint source and preserves its architecture. The current revision focuses on making the **off-chain capstone demo** materially easier and safer to run.

## Fixes applied

1. HMAC verification now uses the decrypted API secret and matches the SDK payload format: `timestamp.nonce.method.path.rawBody`.
2. SDK signing now canonicalizes the URL pathname, preventing history requests with query parameters from failing HMAC verification.
3. API-key secrets are encrypted at rest with AES-256-GCM.
4. Webhook signing secrets are also encrypted at rest and decrypted only for delivery signing.
5. Replay nonces are stored only after a valid HMAC is verified.
6. HMAC-authenticated credit calls now reject suspended/non-active merchants.
7. Redeem logic performs balance validation inside a serializable Prisma transaction.
8. BigInt credit fields are written as BigInt values explicitly.
9. API-key revocation verifies that the key belongs to the merchant in the route.
10. Campaign date and multiplier validation is present.
11. Credit-history `limit` is sanitized.
12. Browser CORS support was added so the Next.js portals on ports 3000/3001 can call the gateway on port 4000.
13. Gateway request metrics were corrected for the Admin infrastructure view.
14. MCP Docker build was corrected so its local `@octapoint/sdk` dependency is available inside the Docker build context.
15. A deterministic `/demo/bootstrap` flow and Compose `demo-seed` service were added. The stack now receives one known local merchant/API credential automatically.
16. A Windows/VS Code run guide and dependency-free static project check were added.
17. JSX syntax in the Merchant API-key page was corrected.
18. A scope error in redeem audit/on-chain handling (`account.id` outside its block) was corrected.

## What was verified in this environment

- ZIP/source structure inspected successfully.
- Dependency-free `node scripts/static-check.mjs` passes.
- TypeScript syntax was parsed with the available global compiler; after excluding missing third-party dependency/type declarations, no additional local syntax/name errors were reported.
- `docker-compose.yml` parses successfully as YAML.

## What could not be executed here

The execution environment used for this review has **no Docker binary and cannot resolve the npm registry**, so third-party dependencies cannot be installed and the real multi-service stack cannot be launched here. Therefore this revision does **not** claim that `npm run build:all`, Prisma startup, Next.js runtime, MCP runtime, or Sui testnet execution were fully executed in this environment.

On a normal Windows machine with Docker Desktop/internet access, use `RUN_WINDOWS.md` and start with:

```powershell
docker compose up --build
```

Keep `CHAIN_MODE=offchain` for the classroom/local demo. Sui/Enoki/Walrus/Stripe production/testnet integration requires external credentials and separate verification.
