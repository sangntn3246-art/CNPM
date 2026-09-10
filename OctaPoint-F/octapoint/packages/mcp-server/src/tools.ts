import { z } from "zod";
import { OctaPointClient } from "@octapoint/sdk";

const client = new OctaPointClient({
  baseUrl: process.env.OCTAPOINT_BASE_URL ?? "http://localhost:4000",
  keyId: process.env.OCTAPOINT_KEY_ID ?? "",
  secret: process.env.OCTAPOINT_SECRET ?? "",
});

const MERCHANT_ID = process.env.OCTAPOINT_MERCHANT_ID ?? "";

/**
 * Every tool below maps 1:1 to a capability described in the proposal's
 * "AI Agent Ready (MCP Integration)" section: an LLM-powered customer
 * support bot or internal ops agent can query balances, inspect history,
 * and — for the write tools — trigger issuance/redemption or spin up a
 * campaign, all through the exact same HMAC-authenticated path a normal
 * SDK integration would use. No special "AI back door" exists: the model
 * is just another API client holding a scoped API key.
 */
export const tools = [
  {
    name: "get_balance",
    description: "Get an end user's current OctaPoint credit balance for this merchant.",
    inputSchema: z.object({
      externalUserId: z.string().describe("The merchant's own identifier for the end user"),
    }),
    handler: async (args: { externalUserId: string }) => {
      const res = await client.getBalance(args.externalUserId);
      return { balance: res.balance };
    },
  },
  {
    name: "get_transaction_history",
    description: "List recent credit transactions (issue/redeem/transfer) for an end user.",
    inputSchema: z.object({
      externalUserId: z.string(),
      limit: z.number().int().positive().max(200).default(20),
    }),
    handler: async (args: { externalUserId: string; limit?: number }) => {
      const res = await client.getHistory(args.externalUserId, args.limit ?? 20);
      return { history: res.history };
    },
  },
  {
    name: "issue_credit",
    description:
      "Issue (award) loyalty credits to an end user, e.g. as a goodwill gesture or purchase reward triggered by a support agent conversation.",
    inputSchema: z.object({
      externalUserId: z.string(),
      amount: z.number().int().positive(),
      reason: z.string().optional().describe("Human-readable reason, stored on the transaction for audit"),
    }),
    handler: async (args: { externalUserId: string; amount: number; reason?: string }) => {
      const res = await client.issueCredit(args);
      return { newBalance: res.balance, transactionId: res.transactionId };
    },
  },
  {
    name: "redeem_credit",
    description: "Redeem (spend) an end user's loyalty credits, e.g. to apply a reward at checkout.",
    inputSchema: z.object({
      externalUserId: z.string(),
      amount: z.number().int().positive(),
      reason: z.string().optional(),
    }),
    handler: async (args: { externalUserId: string; amount: number; reason?: string }) => {
      const res = await client.redeemCredit(args);
      return { newBalance: res.balance, transactionId: res.transactionId };
    },
  },
  {
    name: "list_campaigns",
    description: "List this merchant's active and scheduled loyalty campaigns.",
    inputSchema: z.object({}),
    handler: async () => {
      const res = await client.getCampaigns(MERCHANT_ID);
      return { campaigns: res.campaigns };
    },
  },
  {
    name: "create_campaign",
    description:
      "Create a new automated loyalty campaign (e.g. a 2x points weekend). Use this when an agent decides, based on a conversation or an analytics trigger, that a promotional campaign should be launched.",
    inputSchema: z.object({
      name: z.string(),
      multiplierBps: z.number().int().positive().default(20000).describe("10000 = 1.0x, 20000 = 2.0x"),
      startsAt: z.string().describe("ISO 8601 datetime"),
      endsAt: z.string().describe("ISO 8601 datetime"),
    }),
    handler: async (args: { name: string; multiplierBps?: number; startsAt: string; endsAt: string }) => {
      const res = await client.createCampaign(MERCHANT_ID, args);
      return { campaign: res.campaign };
    },
  },
];
