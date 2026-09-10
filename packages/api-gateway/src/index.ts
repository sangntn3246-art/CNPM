import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { hmacAuth } from "./middleware/hmac.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { merchantsRouter } from "./routes/merchants.js";
import { creditsRouter } from "./routes/credits.js";
import { adminRouter } from "./routes/admin.js";
import { demoRouter } from "./routes/demo.js";
import { shutdown } from "./lib/db.js";

const app = new Hono();

// Browser portals run on :3000/:3001 while the gateway runs on :4000.
// CORS is required for those cross-origin browser requests.
app.use("*", cors({
  origin: process.env.CORS_ORIGIN ?? "*",
  allowHeaders: ["Content-Type", "Authorization", "x-op-key-id", "x-op-timestamp", "x-op-nonce", "x-op-signature", "x-demo-token"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));

app.get("/health", (c) => c.json({ status: "ok", service: "octapoint-api-gateway" }));

// Local demo bootstrap (404 unless DEMO_MODE=true).
app.route("/demo", demoRouter);

// Public: merchant onboarding + key management (would sit behind portal
// session auth in production; kept open here for the reference build).
app.route("/merchants", merchantsRouter);

// Protected: every credit mutation/read requires a valid HMAC signature and
// is rate-limited per merchant.
app.use("/credits/*", hmacAuth, rateLimit({ limit: 120, windowSec: 60 }));
app.route("/credits", creditsRouter);

// Admin/operator surface — bearer-token gated inside the router itself.
app.route("/admin", adminRouter);

app.onError((err, c) => {
  console.error("[gateway] unhandled error:", err);
  return c.json({ error: "internal_error" }, 500);
});

const port = Number(process.env.PORT ?? 4000);
console.log(`[octapoint] API Gateway listening on :${port} (chain mode: ${process.env.CHAIN_MODE ?? "offchain"})`);

const server = serve({ fetch: app.fetch, port });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    console.log(`[octapoint] received ${signal}, shutting down`);
    server.close();
    await shutdown();
    process.exit(0);
  });
}

export default app;
