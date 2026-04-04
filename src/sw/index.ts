/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ─── Install: cache core app shell immediately ────────────────────────────────
self.addEventListener("install", () => {
  // Don't skipWaiting here — let the UI update banner control when to switch.
  // Workbox precache handles the static shell.
});

// ─── Activate: claim all clients so new SW takes over immediately after skip ──
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

// ─── Message: UI triggers update via "SKIP_WAITING" ──────────────────────────
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; type?: string } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const title = payload.title ?? "POSTLAIN";
  const isUrgent = payload.type === "urgent" || payload.type === "import";
  const targetUrl = payload.url ?? "/";

  const options: NotificationOptions = {
    body:    payload.body ?? "",
    icon:    "/icon-192x192.png",
    badge:   "/favicon-32x32.png",
    image:   undefined,
    data:    { url: targetUrl },
    vibrate: isUrgent ? [100, 50, 100, 50, 200] : [150, 80, 150],
    // Unique tag per notification → always rings, never replaces previous
    tag:     `postlain-${Date.now()}`,
    renotify: true,
    requireInteraction: isUrgent,
    silent:  false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: focus existing window or open new ───────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/";

  event.waitUntil(
    (self.clients as Clients)
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if already open
        for (const client of clientList) {
          const c = client as WindowClient;
          if (new URL(c.url).origin === self.location.origin) {
            return c.focus().then(fc => fc.navigate(url));
          }
        }
        // Otherwise open new window
        return (self.clients as Clients).openWindow(url);
      })
  );
});

// ─── Periodic background sync hint (if browser supports it) ──────────────────
// Keeps the app shell fresh even when user hasn't opened it in a while.
self.addEventListener("periodicsync", (event: Event) => {
  const e = event as ExtendableEvent & { tag: string };
  if (e.tag === "app-refresh") {
    e.waitUntil(
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith("pages"))
            .map(k => caches.delete(k))
        )
      )
    );
  }
});
