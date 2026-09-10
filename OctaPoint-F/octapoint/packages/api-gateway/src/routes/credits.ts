import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  getBalance,
  getHistory,
  issueCredit,
  redeemCredit,
  InsufficientBalanceError,
  DuplicateRequestError,
} from "../services/creditService.js";

export const creditsRouter = new Hono();

const issueSchema = z.object({
  externalUserId: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().optional(),
  requestId: z.string().uuid().optional(), // idempotency key; auto-generated if omitted
});

creditsRouter.post("/issue", async (c) => {
  const merchantId = c.get("merchantId") as string;
  const parsed = issueSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { externalUserId, amount, reason, requestId } = parsed.data;
  try {
    const result = await issueCredit({
      merchantId,
      externalUserId,
      amount,
      reason,
      requestId: requestId ?? randomUUID(),
    });
    return c.json({
      balance: result.balance.toString(),
      transactionId: result.transactionId,
    }, 201);
  } catch (err) {
    if (err instanceof DuplicateRequestError) return c.json({ error: "duplicate_request" }, 409);
    throw err;
  }
});

const redeemSchema = issueSchema;

creditsRouter.post("/redeem", async (c) => {
  const merchantId = c.get("merchantId") as string;
  const parsed = redeemSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { externalUserId, amount, reason, requestId } = parsed.data;
  try {
    const result = await redeemCredit({
      merchantId,
      externalUserId,
      amount,
      reason,
      requestId: requestId ?? randomUUID(),
    });
    return c.json({
      balance: result.balance.toString(),
      transactionId: result.transactionId,
    }, 201);
  } catch (err) {
    if (err instanceof InsufficientBalanceError) return c.json({ error: "insufficient_balance" }, 422);
    if (err instanceof DuplicateRequestError) return c.json({ error: "duplicate_request" }, 409);
    throw err;
  }
});

creditsRouter.get("/balance/:externalUserId", async (c) => {
  const merchantId = c.get("merchantId") as string;
  const balance = await getBalance(merchantId, c.req.param("externalUserId"));
  return c.json({ balance: balance.toString() });
});

creditsRouter.get("/history/:externalUserId", async (c) => {
  const merchantId = c.get("merchantId") as string;
  const rawLimit = Number(c.req.query("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 50;
  const history = await getHistory(merchantId, c.req.param("externalUserId"), limit);
  return c.json({
    history: history.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toString(),
      balanceAfter: tx.balanceAfter.toString(),
      reason: tx.reason,
      createdAt: tx.createdAt,
      suiTxDigest: tx.suiTxDigest,
      auditBlobId: tx.auditBlobId,
    })),
  });
});
