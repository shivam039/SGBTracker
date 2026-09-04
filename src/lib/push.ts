import webpush from "web-push";
import { prisma } from "./db";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

/**
 * Sends a push notification to every subscribed browser. No-ops silently if
 * VAPID keys aren't configured (e.g. not yet added to the deployment's env
 * vars) — alert evaluation must never fail because of this.
 * Expired/invalid subscriptions (410/404 from the push service) are deleted.
 */
export async function notifySubscribers(title: string, body: string, url = "/alerts"): Promise<void> {
  if (!configured) return;

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
