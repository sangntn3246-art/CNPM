import { Hono } from "hono";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/db.js";
import { encryptSecret } from "../lib/secrets.js";

export const merchantsRouter = new Hono();

const onboardSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  earnRateBps: z.number().int().positive().default(100),
  redeemRateBps: z.number().int().positive().default(100),
});

/** Self-service merchant signup. Creates the tenant row and marks it PENDING
 *  until an admin (or auto-approval policy) flips it to ACTIVE. */
merchantsRouter.post("/", async (c) => {
  const parsed = onboardSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const merchant = await prisma.merchant.create({ data: { ...parsed.data, status: "PENDING" } });
  return c.json({ merchant }, 201);
});

merchantsRouter.get("/:id", async (c) => {
  const merchant = await prisma.merchant.findUnique({ where: { id: c.req.param("id") } });
  if (!merchant) return c.json({ error: "not_found" }, 404);
  return c.json({ merchant });
});

/** Generates a new API key/secret pair. The plaintext secret is returned
 *  exactly once — only an AES-256-GCM encrypted copy is persisted. */
merchantsRouter.post("/:id/api-keys", async (c) => {
  const merchantId = c.req.param("id");
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true } });
  if (!merchant) return c.json({ error: "not_found" }, 404);
  const label = ((await c.req.json().catch(() => ({}))) as any)?.label ?? "default";

  const keyId = `op_live_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");

  const apiKey = await prisma.apiKey.create({
    data: { merchantId, keyId, secretCiphertext: encryptSecret(secret), label },
  });

  return c.json({
    keyId: apiKey.keyId,
    secret, // shown once — the SDK stores this client-side to sign requests
    label: apiKey.label,
    createdAt: apiKey.createdAt,
  }, 201);
});

merchantsRouter.get("/:id/api-keys", async (c) => {
  const keys = await prisma.apiKey.findMany({
    where: { merchantId: c.req.param("id") },
    select: { id: true, keyId: true, label: true, isActive: true, createdAt: true, lastUsedAt: true },
  });
  return c.json({ apiKeys: keys });
});

merchantsRouter.delete("/:id/api-keys/:keyId", async (c) => {
  const existing = await prisma.apiKey.findFirst({
    where: { keyId: c.req.param("keyId"), merchantId: c.req.param("id") },
    select: { id: true },
  });
  if (!existing) return c.json({ error: "not_found" }, 404);
  await prisma.apiKey.update({ where: { id: existing.id }, data: { isActive: false } });
  return c.json({ revoked: true });
});

/** Dynamic rule engine: earn/redeem ratios + campaign multipliers. */
const ruleSchema = z.object({
  earnRateBps: z.number().int().positive().optional(),
  redeemRateBps: z.number().int().positive().optional(),
});

merchantsRouter.patch("/:id/rules", async (c) => {
  const parsed = ruleSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const merchant = await prisma.merchant.update({
    where: { id: c.req.param("id") },
    data: parsed.data,
  });
  return c.json({ merchant });
});

const campaignSchema = z.object({
  name: z.string().min(2),
  multiplierBps: z.number().int().positive().max(1000000).default(10000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((v) => v.endsAt > v.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] });

merchantsRouter.post("/:id/campaigns", async (c) => {
  const parsed = campaignSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const campaign = await prisma.campaign.create({
    data: { ...parsed.data, merchantId: c.req.param("id") },
  });
  return c.json({ campaign }, 201);
});

merchantsRouter.get("/:id/campaigns", async (c) => {
  const campaigns = await prisma.campaign.findMany({ where: { merchantId: c.req.param("id") } });
  return c.json({ campaigns });
});

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

/** Portal-facing transaction lookup (session-authenticated in production;
 *  open here since this reference build has no portal login flow). */
merchantsRouter.get("/:id/transactions", async (c) => {
  const merchantId = c.req.param("id");
  const externalUserId = c.req.query("externalUserId");

  const where = externalUserId
    ? { merchantId, account: { externalUserId } }
    : { merchantId };

  const transactions = await prisma.transaction.findMany({
    where,
    include: { account: { select: { externalUserId: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return c.json({
    transactions: transactions.map((tx) => ({
      id: tx.id,
      externalUserId: tx.account.externalUserId,
      type: tx.type,
      amount: tx.amount.toString(),
      balanceAfter: tx.balanceAfter.toString(),
      reason: tx.reason,
      createdAt: tx.createdAt,
    })),
  });
});

/** Lightweight merchant-scoped analytics for the portal dashboard. */
merchantsRouter.get("/:id/analytics", async (c) => {
  const merchantId = c.req.param("id");
  const [accountCount, txAgg, recentTx] = await Promise.all([
    prisma.loyaltyAccount.count({ where: { merchantId } }),
    prisma.transaction.groupBy({ by: ["type"], where: { merchantId }, _sum: { amount: true }, _count: true }),
    prisma.transaction.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return c.json({
    accountCount,
    transactionsByType: txAgg.map((row) => ({
      type: row.type,
      count: row._count,
      totalAmount: row._sum.amount?.toString() ?? "0",
    })),
    recentTransactions: recentTx.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toString(),
      createdAt: tx.createdAt,
    })),
  });
});

merchantsRouter.post("/:id/webhooks", async (c) => {
  const parsed = webhookSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const secret = randomBytes(24).toString("hex");
  const webhook = await prisma.webhook.create({
    data: { ...parsed.data, merchantId: c.req.param("id"), secret: encryptSecret(secret) },
  });
  return c.json({ webhook: { ...webhook, secret } }, 201);
});
