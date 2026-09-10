/**
 * Seeds a demo merchant end-to-end so the whole stack has something to show
 * on first boot: a merchant, an ACTIVE status, an API key/secret pair, and
 * one issued + one redeemed transaction for a demo user.
 *
 * Usage:
 *   cd octapoint && npm run seed
 *
 * Prints the values you should copy into .env for
 * NEXT_PUBLIC_MERCHANT_ID / OCTAPOINT_KEY_ID / OCTAPOINT_SECRET.
 */
import { randomUUID } from "node:crypto";

const GATEWAY_URL = process.env.OCTAPOINT_BASE_URL ?? "http://localhost:4000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token-change-me";

async function main() {
  const merchantRes = await fetch(`${GATEWAY_URL}/merchants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Demo Mall Co.",
      slug: `demo-mall-${randomUUID().slice(0, 6)}`,
      earnRateBps: 100,
      redeemRateBps: 100,
    }),
  });
  const { merchant } = (await merchantRes.json()) as { merchant: { id: string } };
  console.log("Created merchant:", merchant.id);

  await fetch(`${GATEWAY_URL}/admin/tenants/${merchant.id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  console.log("Activated merchant");

  const keyRes = await fetch(`${GATEWAY_URL}/merchants/${merchant.id}/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: "seed script" }),
  });
  const { keyId, secret } = (await keyRes.json()) as { keyId: string; secret: string };
  console.log("Created API key:", keyId);

  // Sign one issue + one redeem request the same way the SDK does, using a
  // tiny inline HMAC helper so this script has zero build-step dependency
  // on the SDK package.
  const { createHmac, randomBytes } = await import("node:crypto");
  function sign(method: string, path: string, body: string) {
    const timestamp = String(Date.now());
    const nonce = randomBytes(16).toString("hex");
    const payload = `${timestamp}.${nonce}.${method}.${path}.${body}`;
    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    return {
      "x-op-key-id": keyId,
      "x-op-timestamp": timestamp,
      "x-op-nonce": nonce,
      "x-op-signature": signature,
      "Content-Type": "application/json",
    };
  }

  const issueBody = JSON.stringify({ externalUserId: "demo_user_1", amount: 500, reason: "Welcome bonus" });
  await fetch(`${GATEWAY_URL}/credits/issue`, {
    method: "POST",
    headers: sign("POST", "/credits/issue", issueBody),
    body: issueBody,
  });
  console.log("Issued 500 credits to demo_user_1");

  const redeemBody = JSON.stringify({ externalUserId: "demo_user_1", amount: 120, reason: "Coffee redemption" });
  await fetch(`${GATEWAY_URL}/credits/redeem`, {
    method: "POST",
    headers: sign("POST", "/credits/redeem", redeemBody),
    body: redeemBody,
  });
  console.log("Redeemed 120 credits from demo_user_1");

  console.log("\nAdd these to your .env:\n");
  console.log(`NEXT_PUBLIC_MERCHANT_ID="${merchant.id}"`);
  console.log(`NEXT_PUBLIC_ADMIN_TOKEN="${ADMIN_TOKEN}"`);
  console.log(`OCTAPOINT_MERCHANT_ID="${merchant.id}"`);
  console.log(`OCTAPOINT_KEY_ID="${keyId}"`);
  console.log(`OCTAPOINT_SECRET="${secret}"`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
