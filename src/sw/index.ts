/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ─── Skip Waiting (auto-update) ───────────────────────────────────────────────
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const title = payload.title ?? "Postlain";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: "/icon-192x192.png",
    badge: "/favicon-32x32.png",
    data: { url: payload.url ?? "/" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/";
  event.waitUntil(
    (self.clients as Clients).matchAll({ type: "window" }).then(clientList => {
      for (const client of clientList) {
        if ("focus" in client) return (client as WindowClient).focus();
      }
      return (self.clients as Clients).openWindow(url);
    })
  );
});
