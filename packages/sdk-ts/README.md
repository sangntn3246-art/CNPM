# @octapoint/sdk

TypeScript client SDK for the OctaPoint API.

```bash
npm install
npm run build
```

```ts
import { OctaPointClient } from "@octapoint/sdk";

const op = new OctaPointClient({
  baseUrl: "http://localhost:4000",
  keyId: process.env.OCTAPOINT_KEY_ID!,
  secret: process.env.OCTAPOINT_SECRET!,
});

await op.issueCredit({ externalUserId: "user_123", amount: 500, reason: "purchase#8842" });
const { balance } = await op.getBalance("user_123");
```

Every request is HMAC-SHA256 signed client-side (`src/sign.ts`) to match
the gateway's `hmacAuth` middleware exactly.
