const ENOKI_API_KEY = process.env.ENOKI_API_KEY ?? "";
const ENOKI_API_BASE = "https://api.enoki.mystenlabs.com";

/**
 * Wraps Enoki's REST API for two things:
 *  1. zkLogin: exchange a Google/OAuth id_token for a Sui address, so end
 *     users and merchant staff never see a seed phrase.
 *  2. Sponsored transactions: have Enoki's gas station pay tx fees so
 *     end-user interactions are fully gasless.
 *
 * Requires ENOKI_API_KEY. Without it, callers should keep CHAIN_MODE=offchain
 * so these paths are never hit — the off-chain ledger already gives a fully
 * working walletless experience for demo purposes.
 */
function assertConfigured() {
  if (!ENOKI_API_KEY) {
    throw new Error("ENOKI_API_KEY not configured — set CHAIN_MODE=offchain to skip zkLogin/sponsorship");
  }
}

export async function zkLoginAddressFor(idToken: string, provider: "google" = "google") {
  assertConfigured();
  const res = await fetch(`${ENOKI_API_BASE}/v1/zklogin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ENOKI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, provider }),
  });
  if (!res.ok) throw new Error(`enoki zkLogin failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { address: string; salt: string };
}

export async function sponsorTransaction(txBytesBase64: string, sender: string) {
  assertConfigured();
  const res = await fetch(`${ENOKI_API_BASE}/v1/transaction-blocks/sponsor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ENOKI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ transactionBlockKindBytes: txBytesBase64, sender, network: process.env.SUI_NETWORK ?? "testnet" }),
  });
  if (!res.ok) throw new Error(`enoki sponsorship failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { digest: string; bytes: string; signature: string };
}
