import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypt API secrets at rest. The database stores only ciphertext+IV+auth tag.
 * In production the master key should live in KMS/HSM; for the capstone it is
 * supplied through API_SECRET_ENCRYPTION_KEY as a 64-char hex string.
 */
function masterKey(): Buffer {
  const raw = process.env.API_SECRET_ENCRYPTION_KEY;
  if (!raw) throw new Error("API_SECRET_ENCRYPTION_KEY is required");
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) throw new Error("API_SECRET_ENCRYPTION_KEY must be 32 bytes encoded as hex");
  return key;
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
}

export function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
