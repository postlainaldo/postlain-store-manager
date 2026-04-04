/// <reference lib="webworker" />
/// <reference types="@ducanh2912/next-pwa/types/workbox" />
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// ─── Precache injected by workbox build ──────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── API: always network, never cache ────────────────────────────────────────
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkOnly()
);

// ─── Next.js static chunks (content-hashed) — cache 1yr ─────────────────────
registerRoute(
  ({ url }) => url.pathname.startsWith("/_next/static/"),
  new CacheFirst({
    cacheName: "next-static",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 256, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// ─── Images / audio / fonts ──────────────────────────────────────────────────
registerRoute(
  ({ url }) => /\.(?:png|jpe?g|svg|gif|webp|ico|woff2?|mp3|wav)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// ─── App pages — network first (5s), fallback to cache ───────────────────────
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "pages",
      networkTimeoutSeconds: 5,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
      ],
    })
  )
);

// ─── Lifecycle ───────────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  // Don't auto-skipWaiting — UI update toast controls when to switch
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; type?: string } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const title = payload.title ?? "POSTLAIN";
  const isUrgent = payload.type === "urgent" || payload.type === "import";

  event.waitUntil(
    self.registration.showNotification(title, {
      body:    payload.body ?? "",
      icon:    "/icon-192x192.png",
      badge:   "/favicon-32x32.png",
      data:    { url: payload.url ?? "/" },
      vibrate: isUrgent ? [100, 50, 100, 50, 200] : [150, 80, 150],
      tag:     `postlain-${Date.now()}`,
      renotify: true,
      requireInteraction: isUrgent,
      silent:  false,
    })
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/";

  event.waitUntil(
    (self.clients as Clients)
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          const c = client as WindowClient;
          if (new URL(c.url).origin === self.location.origin) {
            return c.focus().then(fc => fc.navigate(url));
          }
        }
        return (self.clients as Clients).openWindow(url);
      })
  );
});
