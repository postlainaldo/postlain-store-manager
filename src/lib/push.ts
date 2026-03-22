/**
 * Server-side push notification sender using web-push
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webPush = require("web-push") as typeof import("web-push");
import getDb from "./database";

let initialized = false;

function init() {
  if (initialized) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:admin@postlain.store";
  if (!pub || !priv) return;
  webPush.setVapidDetails(email, pub, priv);
  initialized = true;
}

export async function sendPushToAll(payload: object) {
  init();
  if (!initialized) return;
  const db = getDb();
  const subs = db.prepare("SELECT * FROM push_subs").all() as {
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map(sub =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      ).catch((err: { statusCode?: number }) => {
        // Remove expired/invalid subscriptions (410 Gone)
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare("DELETE FROM push_subs WHERE endpoint = ?").run(sub.endpoint);
        }
      })
    )
  );
  return results;
}
