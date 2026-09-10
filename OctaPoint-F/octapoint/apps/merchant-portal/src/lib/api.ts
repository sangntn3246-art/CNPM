const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";
// In this reference build the portal is pre-seeded with one demo merchant
// (see /scripts/seed.ts); a production portal would resolve this from the
// signed-in merchant's session instead of an env var.
export const MERCHANT_ID = process.env.NEXT_PUBLIC_MERCHANT_ID ?? "";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  merchant: () => fetch(`${GATEWAY_URL}/merchants/${MERCHANT_ID}`).then(json<{ merchant: any }>),
  analytics: () => fetch(`${GATEWAY_URL}/merchants/${MERCHANT_ID}/analytics`).then(json<any>),
  apiKeys: () => fetch(`${GATEWAY_URL}/merchants/${MERCHANT_ID}/api-keys`).then(json<{ apiKeys: any[] }>),
  createApiKey: (label: string) =>
    fetch(`${GATEWAY_URL}/merchants/${MERCHANT_ID}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    }).then(json<{ keyId: string; secret: string; label: string }>),
  revokeApiKey: (keyId: string) =>
    fetch(`${GATEWAY_URL}/merchants/${MERCHANT_ID}/api-keys/${keyId}`, { method: "DELETE" }).then(json),
  campaigns: () => fetch(`${GATEWAY_URL}/merchants/${MERCHANT_ID}/campaigns`).then(json<{ campaigns: any[] }>),
  transactions: (externalUserId?: string) =>
    fetch(
      `${GATEWAY_URL}/merchants/${MERCHANT_ID}/transactions${externalUserId ? `?externalUserId=${encodeURIComponent(externalUserId)}` : ""}`,
    ).then(json<{ transactions: any[] }>),
  createCampaign: (input: { name: string; multiplierBps: number; startsAt: string; endsAt: string }) =>
    fetch(`${GATEWAY_URL}/merchants/${MERCHANT_ID}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(json<{ campaign: any }>),
};
