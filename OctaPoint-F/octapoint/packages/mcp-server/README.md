# @octapoint/mcp-server

Model Context Protocol server exposing OctaPoint credit/loyalty tools to AI
agents (Claude Desktop, internal agent runtimes, etc.).

## Tools

| Tool | Purpose |
|---|---|
| `get_balance` | Read an end user's credit balance |
| `get_transaction_history` | Read recent issue/redeem/transfer events |
| `issue_credit` | Award credits (e.g. support-agent goodwill gesture) |
| `redeem_credit` | Spend credits (e.g. apply a reward at checkout) |
| `list_campaigns` | List active/scheduled multiplier campaigns |
| `create_campaign` | Launch a new promotional campaign |

## Run (stdio, for Claude Desktop)

```bash
npm install
npm run build
node dist/index.js
```

## Run (HTTP/SSE, for browser-based agent demos)

```bash
npm run start:http
# -> http://localhost:4100/mcp
```

Configure `OCTAPOINT_BASE_URL`, `OCTAPOINT_KEY_ID`, `OCTAPOINT_SECRET`,
`OCTAPOINT_MERCHANT_ID` via env (see root `.env.example`).
