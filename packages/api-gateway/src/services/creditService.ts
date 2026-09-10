import { prisma } from "../lib/db.js";
import { redis } from "../lib/db.js";
import { flagIfAnomalous } from "../middleware/rateLimit.js";
import { writeAuditRecord } from "./walrusService.js";
import { dispatchWebhooks } from "./webhookService.js";
import { settleOnChain } from "./chainService.js";
import { Prisma } from "@prisma/client";

export class InsufficientBalanceError extends Error {}
export class DuplicateRequestError extends Error {}

const CHAIN_MODE = process.env.CHAIN_MODE ?? "offchain"; // "offchain" | "onchain"

function balanceCacheKey(merchantId: string, externalUserId: string) {
  return `op:balance:${merchantId}:${externalUserId}`;
}

async function getOrCreateAccount(merchantId: string, externalUserId: string) {
  return prisma.loyaltyAccount.upsert({
    where: { merchantId_externalUserId: { merchantId, externalUserId } },
    update: {},
    create: { merchantId, externalUserId },
  });
}

/** Sub-100ms balance read: Redis first, Postgres on miss, then repopulate. */
export async function getBalance(merchantId: string, externalUserId: string) {
  const cacheKey = balanceCacheKey(merchantId, externalUserId);
  const cached = await redis.get(cacheKey);
  if (cached !== null) return BigInt(cached);

  const account = await getOrCreateAccount(merchantId, externalUserId);
  await redis.set(cacheKey, account.balance.toString(), "EX", 30);
  return account.balance;
}

export async function issueCredit(params: {
  merchantId: string;
  externalUserId: string;
  amount: number;
  reason?: string;
  requestId: string;
}) {
  const { merchantId, externalUserId, amount, reason, requestId } = params;
  if (amount <= 0) throw new RangeError("amount must be positive");

  const existing = await prisma.transaction.findUnique({ where: { requestId } });
  if (existing) throw new DuplicateRequestError(requestId);

  await flagIfAnomalous(merchantId, amount);

  const account = await getOrCreateAccount(merchantId, externalUserId);

  let updated: Awaited<ReturnType<typeof getOrCreateAccount>>;
  let tx: Awaited<ReturnType<typeof prisma.transaction.create>>;
  try {
    ({ account: updated, tx } = await prisma.$transaction(async (db) => {
      const account2 = await db.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: BigInt(amount) },
          lifetimeEarned: { increment: BigInt(amount) },
        },
      });
      const tx2 = await db.transaction.create({
        data: {
          merchantId,
          accountId: account.id,
          type: "ISSUE",
          amount: BigInt(amount),
          balanceAfter: account2.balance,
          reason,
          requestId,
        },
      });
      return { account: account2, tx: tx2 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2002" || err.code === "P2034")) {
      if (err.code === "P2002") throw new DuplicateRequestError(requestId);
    }
    throw err;
  }

  await redis.set(balanceCacheKey(merchantId, externalUserId), updated.balance.toString(), "EX", 30);

  const auditBlobId = await writeAuditRecord({ type: "ISSUE", merchantId, accountId: account.id, amount, requestId });
  if (auditBlobId) {
    await prisma.transaction.update({ where: { id: tx.id }, data: { auditBlobId } });
  }

  if (CHAIN_MODE === "onchain") {
    settleOnChain({ type: "issue", merchantId, accountId: account.id, amount }).catch((err) =>
      console.error("[chain] async settlement failed", err),
    );
  }

  await dispatchWebhooks(merchantId, "credit.issued", {
    externalUserId,
    amount,
    newBalance: updated.balance.toString(),
    requestId,
  });

  return { balance: updated.balance, transactionId: tx.id };
}

export async function redeemCredit(params: {
  merchantId: string;
  externalUserId: string;
  amount: number;
  reason?: string;
  requestId: string;
}) {
  const { merchantId, externalUserId, amount, reason, requestId } = params;
  if (amount <= 0) throw new RangeError("amount must be positive");

  const existing = await prisma.transaction.findUnique({ where: { requestId } });
  if (existing) throw new DuplicateRequestError(requestId);

  let updated: Awaited<ReturnType<typeof getOrCreateAccount>>;
  let tx: Awaited<ReturnType<typeof prisma.transaction.create>>;
  let accountId: string;
  try {
    ({ account: updated, tx, accountId } = await prisma.$transaction(async (db) => {
      const account = await db.loyaltyAccount.findUnique({
        where: { merchantId_externalUserId: { merchantId, externalUserId } },
      });
      if (!account || account.balance < BigInt(amount)) {
        throw new InsufficientBalanceError(`insufficient balance`);
      }
      const account2 = await db.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: BigInt(amount) },
          lifetimeRedeemed: { increment: BigInt(amount) },
        },
      });
      const tx2 = await db.transaction.create({
        data: {
          merchantId,
          accountId: account.id,
          type: "REDEEM",
          amount: BigInt(amount),
          balanceAfter: account2.balance,
          reason,
          requestId,
        },
      });
      return { account: account2, tx: tx2, accountId: account.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  } catch (err) {
    if (err instanceof InsufficientBalanceError) throw err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DuplicateRequestError(requestId);
    }
    throw err;
  }

  await redis.set(balanceCacheKey(merchantId, externalUserId), updated.balance.toString(), "EX", 30);

  const auditBlobId = await writeAuditRecord({ type: "REDEEM", merchantId, accountId, amount, requestId });
  if (auditBlobId) {
    await prisma.transaction.update({ where: { id: tx.id }, data: { auditBlobId } });
  }

  if (CHAIN_MODE === "onchain") {
    settleOnChain({ type: "redeem", merchantId, accountId, amount }).catch((err) =>
      console.error("[chain] async settlement failed", err),
    );
  }

  await dispatchWebhooks(merchantId, "credit.redeemed", {
    externalUserId,
    amount,
    newBalance: updated.balance.toString(),
    requestId,
  });

  return { balance: updated.balance, transactionId: tx.id };
}

export async function getHistory(merchantId: string, externalUserId: string, limit = 50) {
  const account = await getOrCreateAccount(merchantId, externalUserId);
  return prisma.transaction.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
}
