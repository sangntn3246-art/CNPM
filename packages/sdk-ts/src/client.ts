import { signRequest } from "./sign.js";

export interface OctaPointClientOptions {
  /** e.g. "https://api.octapoint.io" or "http://localhost:4000" */
  baseUrl: string;
  keyId: string;
  secret: string;
  /** override fetch, e.g. for testing */
  fetchImpl?: typeof fetch;
}

export interface IssueOrRedeemInput {
  externalUserId: string;
  amount: number;
  reason?: string;
  /** supply your own idempotency key to make retries safe */
  requestId?: string;
}

export interface CreditResult {
  balance: string;
  transactionId: string;
}

export interface TransactionRecord {
  id: string;
  type: "ISSUE" | "REDEEM" | "TRANSFER" | "EXPIRE";
  amount: string;
  balanceAfter: string;
  reason: string | null;
  createdAt: string;
  suiTxDigest: string | null;
  auditBlobId: string | null;
}

/**
 * OctaPoint TypeScript SDK.
 *
 * ```ts
 * const op = new OctaPointClient({
 *   baseUrl: "https://api.octapoint.io",
 *   keyId: process.env.OCTAPOINT_KEY_ID!,
 *   secret: process.env.OCTAPOINT_SECRET!,
 * });
 *
 * await op.issueCredit({ externalUserId: "user_123", amount: 500, reason: "purchase#8842" });
 * const { balance } = await op.getBalance("user_123");
 * ```
 */
export class OctaPointClient {
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly secret: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OctaPointClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.keyId = opts.keyId;
    this.secret = opts.secret;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const rawBody = body === undefined ? "" : JSON.stringify(body);
    // The gateway signs the URL pathname, not the query string. Keep query
    // parameters on the fetch URL but canonicalize the signature path.
    const signingPath = new URL(`${this.baseUrl}${path}`).pathname;
    const headers = signRequest({ keyId: this.keyId, secret: this.secret, method, path: signingPath, body: rawBody });

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : rawBody,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new OctaPointApiError(res.status, (errBody as any)?.error ?? "unknown_error", errBody);
    }
    return (await res.json()) as T;
  }

  issueCredit(input: IssueOrRedeemInput): Promise<CreditResult> {
    return this.request<CreditResult>("POST", "/credits/issue", input);
  }

  redeemCredit(input: IssueOrRedeemInput): Promise<CreditResult> {
    return this.request<CreditResult>("POST", "/credits/redeem", input);
  }

  getBalance(externalUserId: string): Promise<{ balance: string }> {
    return this.request<{ balance: string }>("GET", `/credits/balance/${encodeURIComponent(externalUserId)}`);
  }

  getHistory(externalUserId: string, limit = 50): Promise<{ history: TransactionRecord[] }> {
    return this.request<{ history: TransactionRecord[] }>(
      "GET",
      `/credits/history/${encodeURIComponent(externalUserId)}?limit=${limit}`,
    );
  }

  /**
   * Registers a webhook listener for real-time event delivery
   * (credit.issued, credit.redeemed, ...). Requires the merchant's session
   * token rather than an HMAC key in a full deployment — exposed here for
   * completeness of the SDK surface described in the proposal.
   */
  registerWebhook(merchantId: string, url: string, events: string[]) {
    return this.request<{ webhook: { id: string; url: string; secret: string } }>(
      "POST",
      `/merchants/${merchantId}/webhooks`,
      { url, events },
    );
  }

  getCampaigns(merchantId: string): Promise<{ campaigns: CampaignRecord[] }> {
    return this.request<{ campaigns: CampaignRecord[] }>("GET", `/merchants/${merchantId}/campaigns`);
  }

  createCampaign(merchantId: string, input: CreateCampaignInput): Promise<{ campaign: CampaignRecord }> {
    return this.request<{ campaign: CampaignRecord }>("POST", `/merchants/${merchantId}/campaigns`, input);
  }
}

export interface CreateCampaignInput {
  name: string;
  multiplierBps?: number;
  startsAt: string;
  endsAt: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  multiplierBps: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export class OctaPointApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public raw: unknown,
  ) {
    super(`OctaPoint API error ${status}: ${code}`);
  }
}
