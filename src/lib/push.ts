/**
 * Server-side push notification sender using web-push
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webPush = require("web-push") as typeof import("web-push");
import { dbGetPushSubs, dbDeletePushSub } from "./dbAdapter";

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

  const subs = await dbGetPushSubs();
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subs.map(sub =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      ).catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await dbDeletePushSub(sub.endpoint);
        }
      })
    )
  );
  return results;
}
