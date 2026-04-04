"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      const applyUpdate = (reg: ServiceWorkerRegistration) => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      };

      navigator.serviceWorker.ready.then(reg => {
        if (reg.waiting) setUpdateReady(true);

        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });

        // Check for updates every 60s (catches deploys while app is open)
        const checkInterval = setInterval(() => reg.update(), 60_000);
        // Cleanup on unload
        window.addEventListener("beforeunload", () => clearInterval(checkInterval), { once: true });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });

      // Register periodic background sync if supported (keeps app shell fresh)
      navigator.serviceWorker.ready.then(reg => {
        if ("periodicSync" in reg) {
          (reg as unknown as { periodicSync: { register: (tag: string, opts: object) => Promise<void> } })
            .periodicSync.register("app-refresh", { minInterval: 24 * 60 * 60 * 1000 })
            .catch(() => {});
        }
      });

      // Store applyUpdate so handleUpdate can use it
      (window as unknown as { __pwa_apply_update?: (r: ServiceWorkerRegistration) => void }).__pwa_apply_update = applyUpdate;
    }
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        const apply = (window as unknown as { __pwa_apply_update?: (r: ServiceWorkerRegistration) => void }).__pwa_apply_update;
        if (apply) apply(reg);
        else if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      });
    }
    setUpdateReady(false);
  };

  if (!hydrated) return null;

  return (
    <UpdateContext.Provider value={{ updateReady, onUpdate: handleUpdate }}>
      <SplashScreen />
      {/* Global update toast — visible anywhere in the app */}
      <AnimatePresence>
        {updateReady && (
          <motion.div
            initial={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
              zIndex: 9999, width: "min(360px, calc(100vw - 24px))",
              background: "linear-gradient(135deg, #0c1a2e, #162336)",
              border: "1px solid rgba(201,165,90,0.4)",
              borderRadius: 14, padding: "11px 16px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#C9A55A", margin: 0 }}>Có phiên bản mới</p>
              <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, marginTop: 1 }}>Cập nhật để dùng tính năng mới nhất</p>
            </div>
            <button onClick={handleUpdate}
              style={{
                padding: "7px 14px", borderRadius: 8, border: "none", flexShrink: 0,
                background: "linear-gradient(135deg, #C9A55A, #a07c3a)",
                color: "#0c1a2e", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              }}>
              Cập nhật
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <OnboardingGate>
        {children}
      </OnboardingGate>
    </UpdateContext.Provider>
  );
}

export function useUpdateContext() { return useContext(UpdateContext); }
