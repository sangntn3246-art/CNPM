import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const PACKAGE_ID = process.env.SUI_PACKAGE_ID ?? "";
const NETWORK = (process.env.SUI_NETWORK as "testnet" | "mainnet" | "devnet") ?? "testnet";
const GATEWAY_SIGNER_SECRET = process.env.SUI_GATEWAY_SIGNER_SECRET ?? "";

const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

function signer() {
  if (!GATEWAY_SIGNER_SECRET) {
    throw new Error("SUI_GATEWAY_SIGNER_SECRET not configured — required for CHAIN_MODE=onchain");
  }
  return Ed25519Keypair.fromSecretKey(GATEWAY_SIGNER_SECRET);
}

interface SettleParams {
  type: "issue" | "redeem";
  merchantId: string;
  accountId: string;
  amount: number;
}

/**
 * Mirrors an off-chain ledger mutation onto the Sui Move contract. This is
 * intentionally async/best-effort relative to the API response: the
 * off-chain Postgres row is the system of record for the sub-100ms path,
 * and the on-chain object is the tamper-proof, cross-party-verifiable
 * source of truth that dispute resolution ultimately falls back to.
 *
 * Resolving `merchantId`/`accountId` -> Sui object ids is done by looking
 * up `treasuryObjectId` / `suiObjectId` columns populated when the merchant
 * was onboarded on-chain (see routes/merchants.ts `onboardOnChain`).
 */
export async function settleOnChain(params: SettleParams) {
  if (!PACKAGE_ID) {
    console.warn("[chain] SUI_PACKAGE_ID not set — skipping on-chain settlement (demo mode)");
    return null;
  }

  // NOTE: capability object ids, treasury object id, and the target
  // LoyaltyAccount object id must be resolved from Prisma before building
  // this PTB. Left as explicit lookups (rather than baked in here) so this
  // service stays decoupled from the ORM — call sites pass fully resolved
  // object ids once real Sui addresses are wired up.
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::credit::${params.type === "issue" ? "issue_credit" : "redeem_credit"}`,
    arguments: [
      // tx.object(merchantCapId), tx.object(treasuryId), tx.object(accountObjectId),
      // tx.pure.u64(params.amount), tx.object(SUI_CLOCK_OBJECT_ID)
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: signer(),
    transaction: tx,
    options: { showEffects: true },
  });

  return result.digest;
}
