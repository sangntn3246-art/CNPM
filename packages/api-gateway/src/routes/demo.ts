import { Hono } from "hono";
import { prisma } from "../lib/db.js";
import { encryptSecret } from "../lib/secrets.js";
import { issueCredit, redeemCredit, DuplicateRequestError } from "../services/creditService.js";

export const demoRouter = new Hono();

const DEMO_MERCHANT_ID = process.env.DEMO_MERCHANT_ID ?? "00000000-0000-4000-8000-000000000001";
const DEMO_API_KEY_ID = process.env.DEMO_API_KEY_ID ?? "op_demo_local";
const DEMO_API_SECRET = process.env.DEMO_API_SECRET ?? "octapoint-demo-secret-change-me";
const DEMO_BOOTSTRAP_TOKEN = process.env.DEMO_BOOTSTRAP_TOKEN ?? "";

/**
 * Local-development bootstrap only. Creates a deterministic merchant and API
 * credential so Docker Compose can bring the whole demo up without manually
 * copying IDs/secrets between services.
 */
demoRouter.post("/bootstrap", async (c) => {
  if (process.env.DEMO_MODE !== "true") return c.json({ error: "not_found" }, 404);

  const token = c.req.header("x-demo-token");
  if (!DEMO_BOOTSTRAP_TOKEN || token !== DEMO_BOOTSTRAP_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const merchant = await prisma.merchant.upsert({
    where: { slug: "demo-mall" },
    update: { status: "ACTIVE", name: "Demo Mall Co." },
    create: {
      id: DEMO_MERCHANT_ID,
      name: "Demo Mall Co.",
      slug: "demo-mall",
      status: "ACTIVE",
      earnRateBps: 100,
      redeemRateBps: 100,
    },
  });

  await prisma.apiKey.upsert({
    where: { keyId: DEMO_API_KEY_ID },
    update: {
      merchantId: merchant.id,
      label: "Docker demo key",
      isActive: true,
      secretCiphertext: encryptSecret(DEMO_API_SECRET),
    },
    create: {
      merchantId: merchant.id,
      keyId: DEMO_API_KEY_ID,
      label: "Docker demo key",
      secretCiphertext: encryptSecret(DEMO_API_SECRET),
    },
  });

  try {
    await issueCredit({
      merchantId: merchant.id,
      externalUserId: "demo_user_1",
      amount: 500,
      reason: "Welcome bonus",
      requestId: "00000000-0000-4000-8000-000000000101",
    });
  } catch (err) {
    if (!(err instanceof DuplicateRequestError)) throw err;
  }

  try {
    await redeemCredit({
      merchantId: merchant.id,
      externalUserId: "demo_user_1",
      amount: 120,
      reason: "Coffee redemption",
      requestId: "00000000-0000-4000-8000-000000000102",
    });
  } catch (err) {
    if (!(err instanceof DuplicateRequestError)) throw err;
  }

  return c.json({
    ready: true,
    merchantId: merchant.id,
    keyId: DEMO_API_KEY_ID,
    demoUser: "demo_user_1",
  });
});
