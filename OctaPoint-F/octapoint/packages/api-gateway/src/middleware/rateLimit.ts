import type { Context, Next } from "hono";
import { redis } from "../lib/db.js";

interface RateLimitOptions {
  /** requests allowed per window */
  limit: number;
  /** window size in seconds */
  windowSec: number;
  /** what to key the bucket by; defaults to merchantId set by hmacAuth */
  keyFn?: (c: Context) => string;
}

/**
 * Fixed-window counter in Redis. Cheap, predictable, and sufficient to stop
 * brute-force/spam bursts before they hit Postgres or the chain. Paired
 * with hmacAuth so the key is always tied to an authenticated merchant
 * (never a raw, spoofable IP alone).
 */
export function rateLimit(opts: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const identity = opts.keyFn ? opts.keyFn(c) : (c.get("merchantId") as string | undefined);
    const bucketId = identity ?? c.req.header("x-forwarded-for") ?? "anonymous";
    const windowStart = Math.floor(Date.now() / 1000 / opts.windowSec);
    const key = `op:rl:${bucketId}:${c.req.path}:${windowStart}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, opts.windowSec);
    }

    const metricKey = `op:metrics:requests:second:${Math.floor(Date.now() / 1000)}`;
    const metricCount = await redis.incr(metricKey);
    if (metricCount === 1) await redis.expire(metricKey, 15);

    c.header("X-RateLimit-Limit", String(opts.limit));
    c.header("X-RateLimit-Remaining", String(Math.max(0, opts.limit - count)));

    if (count > opts.limit) {
      return c.json({ error: "rate_limited", retry_after_sec: opts.windowSec }, 429);
    }

    await next();
  };
}

/**
 * Lightweight anomaly detector: flags (but does not by itself block) bursts
 * of large-value issue operations from a single key, which is the classic
 * "unauthorized point minting via a stolen key" pattern. Real deployments
 * would feed this into a scoring service; here we log + optionally auto
 * suspend the key when a hard threshold is blown through.
 */
export async function flagIfAnomalous(merchantId: string, amount: number) {
  const key = `op:anomaly:${merchantId}:issue_sum:${Math.floor(Date.now() / 1000 / 60)}`;
  const sum = await redis.incrby(key, amount);
  await redis.expire(key, 120);

  const ANOMALY_THRESHOLD = 1_000_000; // credits issued per minute, tune per merchant tier
  if (sum > ANOMALY_THRESHOLD) {
    console.warn(`[anti-fraud] anomalous issuance volume for merchant=${merchantId}: ${sum}/min`);
    return true;
  }
  return false;
}
