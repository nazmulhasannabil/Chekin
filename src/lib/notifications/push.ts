import webPush from "web-push";
import connectDB from "@/lib/db/connection";
import { PushSubscription } from "@/lib/db/models";
import type { NotificationType } from "@/lib/db/models/notification.model";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@chekin.app";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  url?: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[Push] VAPID not configured. Would send to user:", userId);
    return;
  }

  await connectDB();

  const subscriptions = await PushSubscription.find({
    userId,
    isActive: true,
  }).lean();

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-72.png",
    data: { url: payload.url ?? "/app/attendance", ...payload.data },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        notification
      )
    )
  );

  // Mark expired subscriptions as inactive
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (
      result.status === "rejected" &&
      (result.reason as { statusCode?: number })?.statusCode === 410
    ) {
      await PushSubscription.updateOne(
        { _id: subscriptions[i]._id },
        { isActive: false }
      );
    }
  }
}

export async function sendNotificationToUser(
  userId: string,
  organizationId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const { Notification } = await import("@/lib/db/models");

  // Store in-app notification
  await Notification.create({
    organizationId,
    recipientUserId: userId,
    type,
    channel: "IN_APP",
    title,
    body,
    data,
  });

  // Send push notification
  await sendPushNotification(userId, { title, body, data });
}
