# OctaPoint PRO UI — Parallel ports

This build is isolated from the original local stack.

Host ports:
- Merchant Portal: http://localhost:3100
- Admin Portal: http://localhost:3101
- API Gateway: http://localhost:4200
- MCP Server: http://localhost:4300
- PostgreSQL: localhost:5433
- Redis: localhost:6380

Compose project name: `octapoint-pro`

Run with `docker compose up --build`.
Stop with `docker compose down`. Do not use `-v` unless you intentionally want to delete this PRO stack's local data.
