import { createHmac, randomBytes } from "node:crypto";

export interface SignedHeaders {
  "x-op-key-id": string;
  "x-op-timestamp": string;
  "x-op-nonce": string;
  "x-op-signature": string;
}

/**
 * Produces the exact header set the API Gateway's `hmacAuth` middleware
 * expects. Keep this in lockstep with
 * packages/api-gateway/src/middleware/hmac.ts.
 */
export function signRequest(opts: {
  keyId: string;
  secret: string;
  method: string;
  path: string;
  body: string;
}): SignedHeaders {
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString("hex");
  const payload = `${timestamp}.${nonce}.${opts.method}.${opts.path}.${opts.body}`;
  const signature = createHmac("sha256", opts.secret).update(payload).digest("hex");

  return {
    "x-op-key-id": opts.keyId,
    "x-op-timestamp": timestamp,
    "x-op-nonce": nonce,
    "x-op-signature": signature,
  };
}
