"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useStore } from "@/store/useStore";
import SplashScreen from "@/components/SplashScreen";
import OnboardingGate from "@/components/OnboardingGate";

// ─── Update context (consumed by Settings page) ───────────────────────────────
export const UpdateContext = createContext<{ updateReady: boolean; onUpdate: () => void }>({
  updateReady: false,
  onUpdate: () => {},
});

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // ── Store hydration ──────────────────────────────────────────
    // IMPORTANT: We no longer wipe localStorage on version bump because
    // that was deleting all user/settings data. Instead we do a targeted
    // migration if needed.
    const CURRENT_VERSION = "5";
    const storedVersion = localStorage.getItem("postlain-auth-version");
    if (storedVersion !== CURRENT_VERSION) {
      // Migrate: keep user/settings, clear volatile display/warehouse data
      // (storeSections/warehouseShelves are now DB-sourced; stale local data
      //  can contain objects instead of string IDs which crashes ProductCard)
      try {
        const raw = localStorage.getItem("postlain-store-v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed?.state?.shelfLayout;
          delete parsed?.state?.storeSections;
          delete parsed?.state?.warehouseShelves;
          localStorage.setItem("postlain-store-v2", JSON.stringify(parsed));
        }
      } catch { /* ignore parse errors */ }
      localStorage.setItem("postlain-auth-version", CURRENT_VERSION);
    }

    useStore.persist.rehydrate();

    const state = useStore.getState();

    // ── Load users from DB (source of truth) ─────────────────────
    state.fetchUsersFromDb();

    // ── Sync products + warehouse from DB ────────────────────────
    state.fetchDbState();

    // ── Validate current session ─────────────────────────────────
    // If the logged-in user was deleted from DB, force logout
    if (state.currentUser) {
      fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.currentUser.id }),
      }).then(r => { if (r.status === 404) useStore.getState().logout(); })
        .catch(() => {});
    }

    setHydrated(true);

    // ── Push Notification subscription ───────────────────────────
    // Only auto-subscribe if permission already granted (no popup on load).
    // If permission is "default", user must click "Đăng ký lại" in Profile > Cài Đặt.
    const registerPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return; // don't prompt on load
      const s = useStore.getState();
      if (!s.currentUser) return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(vapidKey),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: s.currentUser.id, subscription: sub.toJSON() }),
        });
      } catch { /* browser unsupported or subscribe failed */ }
    };
    registerPush();

    // ── PWA Service Worker update detection ──────────────────────
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg.waiting) setUpdateReady(true);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });
    }
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      });
    }
    setUpdateReady(false);
  };

  if (!hydrated) return null;

  return (
    <UpdateContext.Provider value={{ updateReady, onUpdate: handleUpdate }}>
      <SplashScreen />
      <OnboardingGate>
        {children}
      </OnboardingGate>
    </UpdateContext.Provider>
  );
}

export function useUpdateContext() { return useContext(UpdateContext); }
