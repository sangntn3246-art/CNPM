import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

// Single shared Prisma client (Postgres) — holds merchants, accounts, tx log.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

// Single shared Redis client — used for the rate limiter, idempotency
// locks, and the hot balance cache that keeps POS checkout under 100ms.
export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => {
  console.error("[redis] connection error", err.message);
});

export async function shutdown() {
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
}
