import { Hono } from "hono";
import type { Context, Next } from "hono";
import { prisma } from "../lib/db.js";
import { redis } from "../lib/db.js";

export const adminRouter = new Hono();

/** Simple bearer-token gate for the admin/operator surface. Swap for real
 *  SSO + RBAC (see MerchantUser.role) in production. */
async function adminAuth(c: Context, next: Next) {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
}
adminRouter.use("*", adminAuth);

adminRouter.get("/tenants", async (c) => {
  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { accounts: true, apiKeys: true } } },
  });
  return c.json({ merchants });
});

adminRouter.patch("/tenants/:id/status", async (c) => {
  const { status } = (await c.req.json()) as { status?: string };
  if (!status || !["PENDING", "ACTIVE", "SUSPENDED"].includes(status)) {
    return c.json({ error: "invalid_status" }, 400);
  }
  const merchant = await prisma.merchant.update({
    where: { id: c.req.param("id") },
    data: { status: status as "PENDING" | "ACTIVE" | "SUSPENDED" },
  });
  return c.json({ merchant });
});

/** Platform-wide analytics rollup. In production this reads from
 *  ClickHouse for speed at scale; here it's a direct Postgres aggregate,
 *  which is plenty fast for a capstone-scale dataset. */
adminRouter.get("/analytics/overview", async (c) => {
  const [merchantCount, activeMerchants, accountCount, txAgg] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: "ACTIVE" } }),
    prisma.loyaltyAccount.count(),
    prisma.transaction.groupBy({ by: ["type"], _sum: { amount: true }, _count: true }),
  ]);

  return c.json({
    merchantCount,
    activeMerchants,
    accountCount,
    transactionsByType: txAgg.map((row) => ({
      type: row.type,
      count: row._count,
      totalAmount: row._sum.amount?.toString() ?? "0",
    })),
  });
});

/** Infra/blockchain monitoring: gateway throughput from Redis counters +
 *  gas treasury balance placeholder (wire to Enoki's treasury API once a
 *  real key is configured). */
adminRouter.get("/infra/status", async (c) => {
  const now = Math.floor(Date.now() / 1000);
  const keys = Array.from({ length: 5 }, (_, i) => `op:metrics:requests:second:${now - i}`);
  const samples = await redis.mget(keys);
  const sampledRequestCount = samples.reduce((sum, value) => sum + Number(value ?? 0), 0);

  return c.json({
    gatewayUptime: process.uptime(),
    approxRequestsLast5s: sampledRequestCount,
    chainMode: process.env.CHAIN_MODE ?? "offchain",
    gasTreasury: {
      note: "Connect ENOKI_API_KEY to pull live sponsorship treasury balance",
      network: process.env.SUI_NETWORK ?? "testnet",
    },
  });
});
