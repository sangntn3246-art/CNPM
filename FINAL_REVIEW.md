# OctaPoint Final Review Notes

This package is based on the supplied `octapoint-source.zip` and keeps its architecture and terminology. The following corrections were applied:

1. **HMAC correctness fixed**: the gateway now decrypts the stored API secret and verifies `HMAC-SHA256(secret, timestamp.nonce.method.path.rawBody)`. The previous implementation hashed the secret before HMAC verification, which did not match the SDK.
2. **API secrets encrypted at rest**: API key secrets use AES-256-GCM with `API_SECRET_ENCRYPTION_KEY`; plaintext is returned only during key creation.
3. **Replay protection hardened**: timestamp, nonce format, signature format and Redis NX nonce locking are validated before accepting a request.
4. **Redeem race condition hardened**: balance validation is performed inside a serializable Prisma transaction, preventing concurrent redemptions from overspending the account.
5. **Campaign validation fixed**: `endsAt` must be later than `startsAt`, and multiplier values are bounded.
6. **npm workspace compatibility fixed**: MCP now consumes the local SDK with `file:../sdk-ts`, avoiding the unsupported `workspace:*` protocol under npm.
7. **Build scripts added**: `npm run build:all` builds SDK, gateway, MCP server and both portals in sequence.
8. **Blockchain limitation remains explicit**: `CHAIN_MODE=onchain` requires real Sui Testnet package/object IDs and a signer. The Move contract requires ownership of the `LoyaltyAccount`; a production walletless flow should use a user signature + Enoki sponsorship rather than pretending the backend can mutate a user-owned object.

## Required configuration

Set a strong 32-byte hexadecimal key in `API_SECRET_ENCRYPTION_KEY` before creating API credentials. Never commit `.env` or production secrets.

## Verification checklist

- `docker compose up --build`
- `npx prisma db push --schema packages/api-gateway/prisma/schema.prisma`
- `npm run seed`
- Verify `/health`
- Verify issue → balance → redeem → history
- Verify duplicate request rejection
- Verify invalid HMAC rejection
- Verify replayed nonce rejection
- Run SDK build and MCP build
- For blockchain demo, deploy Move package to Sui Testnet and configure package/object IDs before enabling `CHAIN_MODE=onchain`.
