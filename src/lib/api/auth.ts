import crypto from "crypto";
import connectDB from "@/lib/db/connection";
import ApiKey from "@/lib/db/models/apiKey.model";

/**
 * Authenticate an API request using an API key.
 * Returns the org + permissions if valid, null otherwise.
 */
export async function authenticateApiKey(
  apiKey: string
): Promise<{ organizationId: string; permissions: string[] } | null> {
  if (!apiKey || !apiKey.startsWith("ck_")) return null;

  await connectDB();

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const key = await ApiKey.findOne({ keyHash, isActive: true }).lean();
  if (!key) return null;

  // Check expiry
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  // Update last used
  await ApiKey.updateOne({ _id: key._id }, { lastUsedAt: new Date() });

  return {
    organizationId: key.organizationId.toString(),
    permissions: key.permissions,
  };
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Deliver a webhook to all active subscribers for an event type.
 */
export async function deliverWebhook(
  organizationId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  await connectDB();

  const Webhook = (await import("@/lib/db/models/webhook.model")).default;
  const webhooks = await Webhook.find({
    organizationId,
    events: eventType,
    isActive: true,
  }).lean();

  const payloadStr = JSON.stringify({ event: eventType, ...payload, timestamp: Date.now() });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const signature = signWebhookPayload(payloadStr, wh.secret);
      try {
        const res = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Chekin-Signature": `sha256=${signature}`,
            "X-Chekin-Event": eventType,
          },
          body: payloadStr,
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          await Webhook.updateOne(
            { _id: wh._id },
            { $inc: { failureCount: 1 } }
          );
        } else {
          await Webhook.updateOne(
            { _id: wh._id },
            { lastTriggeredAt: new Date(), $set: { failureCount: 0 } }
          );
        }
      } catch {
        await Webhook.updateOne(
          { _id: wh._id },
          { $inc: { failureCount: 1 } }
        );
      }
    })
  );
}
