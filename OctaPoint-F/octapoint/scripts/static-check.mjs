import fs from "node:fs";

const required = [
  "package.json",
  ".env.example",
  "docker-compose.yml",
  "packages/api-gateway/src/index.ts",
  "packages/api-gateway/src/routes/demo.ts",
  "packages/api-gateway/prisma/schema.prisma",
  "packages/sdk-ts/src/client.ts",
  "packages/mcp-server/src/httpServer.ts",
  "apps/merchant-portal/src/app/page.tsx",
  "apps/admin-portal/src/app/page.tsx",
  "contracts/octapoint/sources/credit.move",
];

let failed = false;
for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`[static-check] missing: ${file}`);
    failed = true;
  }
}

const hmac = fs.readFileSync("packages/api-gateway/src/middleware/hmac.ts", "utf8");
const sdk = fs.readFileSync("packages/sdk-ts/src/sign.ts", "utf8");
for (const token of ["timestamp", "nonce", "method", "path"]) {
  if (!hmac.includes(token) || !sdk.includes(token)) {
    console.error(`[static-check] HMAC contract missing token: ${token}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("[static-check] project structure and HMAC contract checks passed");
