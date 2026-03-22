/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const title = payload.title ?? "Postlain";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
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
