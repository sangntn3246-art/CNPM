import { createHmac } from "node:crypto";
import { prisma } from "../lib/db.js";
import { decryptSecret } from "../lib/secrets.js";

/**
 * Fires all active webhooks a merchant has registered for a given event.
 * Each payload is HMAC-signed with the webhook's own secret so receivers
 * can verify authenticity the same way the gateway verifies inbound SDK
 * calls (see middleware/hmac.ts) — symmetric trust model end to end.
 */
export async function dispatchWebhooks(merchantId: string, event: string, data: Record<string, unknown>) {
  const webhooks = await prisma.webhook.findMany({
    where: { merchantId, isActive: true, events: { has: event } },
  });

  await Promise.allSettled(
    webhooks.map(async (hook) => {
      const body = JSON.stringify({ event, data, sentAt: new Date().toISOString() });
      const signature = createHmac("sha256", decryptSecret(hook.secret)).update(body).digest("hex");
      try {
        await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-OP-Webhook-Signature": signature },
          body,
        });
      } catch (err) {
        console.error(`[webhook] delivery failed for merchant=${merchantId} url=${hook.url}:`, err);
      }
    }),
  );
}
