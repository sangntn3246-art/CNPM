import type { Context, Next } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../lib/db.js";
import { redis } from "../lib/db.js";
import { decryptSecret } from "../lib/secrets.js";

/**
 * HMAC authentication for SDK requests.
 * Signature = HMAC-SHA256(secret, timestamp.nonce.method.path.rawBody)
 */
export async function hmacAuth(c: Context, next: Next) {
  const keyId = c.req.header("x-op-key-id");
  const timestamp = c.req.header("x-op-timestamp");
  const nonce = c.req.header("x-op-nonce");
  const signature = c.req.header("x-op-signature");
  if (!keyId || !timestamp || !nonce || !signature) return c.json({ error: "missing_auth_headers" }, 401);

  const timestampMs = Number(timestamp);
  if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return c.json({ error: "stale_or_invalid_timestamp" }, 401);
  }
  if (!/^[0-9a-fA-F]{32,128}$/.test(nonce)) return c.json({ error: "invalid_nonce" }, 401);
  if (!/^[0-9a-fA-F]{64}$/.test(signature)) return c.json({ error: "invalid_signature" }, 401);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyId },
    include: { merchant: { select: { status: true } } },
  });
  if (!apiKey || !apiKey.isActive) return c.json({ error: "invalid_api_key" }, 401);
  if (apiKey.merchant.status !== "ACTIVE") return c.json({ error: "merchant_not_active" }, 403);

  const rawBody = await c.req.raw.clone().text();
  const payload = `${timestamp}.${nonce}.${c.req.method}.${c.req.path}.${rawBody}`;
  let secret: string;
  try {
    secret = decryptSecret(apiKey.secretCiphertext);
  } catch {
    return c.json({ error: "credential_configuration_error" }, 500);
  }
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const valid = timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  if (!valid) return c.json({ error: "invalid_signature" }, 401);

  // Record the nonce only after the signature is proven valid, preventing
  // unauthenticated requests from filling the replay-protection keyspace.
  const nonceKey = `op:nonce:${keyId}:${nonce}`;
  const firstSeen = await redis.set(nonceKey, "1", "EX", 600, "NX");
  if (firstSeen === null) return c.json({ error: "replayed_request" }, 401);

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  c.set("merchantId", apiKey.merchantId);
  c.set("apiKeyId", apiKey.id);
  await next();
}
