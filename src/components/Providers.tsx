"use client";

import { useEffect, useState, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
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

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "2.1.0";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  // "justUpdated" = true khi vừa reload sau auto-update → hiện toast "Đã cập nhật"
  const [justUpdated, setJustUpdated] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // ── PWA Service Worker — auto-update silently ─────────────────
    if ("serviceWorker" in navigator) {
      const applyNow = (reg: ServiceWorkerRegistration) => {
        if (reg.waiting) {
          // Đánh dấu "vừa update" vào sessionStorage để sau khi reload hiện toast
          try { sessionStorage.setItem("plsm_just_updated", APP_VERSION); } catch {}
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      };

      navigator.serviceWorker.ready.then(reg => {
        // Nếu có waiting SW ngay khi load → apply luôn
        if (reg.waiting) applyNow(reg);

        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              // SW mới sẵn sàng → apply ngay, không hỏi user
              applyNow(reg);
            }
          });
        });

        // Kiểm tra update mỗi 60s khi app đang mở
        const checkInterval = setInterval(() => reg.update(), 60_000);
        window.addEventListener("beforeunload", () => clearInterval(checkInterval), { once: true });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });

      navigator.serviceWorker.ready.then(reg => {
        if ("periodicSync" in reg) {
          (reg as unknown as { periodicSync: { register: (tag: string, opts: object) => Promise<void> } })
            .periodicSync.register("app-refresh", { minInterval: 24 * 60 * 60 * 1000 })
            .catch(() => {});
        }
      });
    }

    // ── Hiện toast "Đã cập nhật" nếu vừa reload sau auto-update ──
    try {
      const justUpdatedVersion = sessionStorage.getItem("plsm_just_updated");
      if (justUpdatedVersion) {
        sessionStorage.removeItem("plsm_just_updated");
        setJustUpdated(true);
        dismissTimer.current = setTimeout(() => setJustUpdated(false), 4000);
      }
    } catch {}
  }, []);

  // Cleanup timer khi unmount
  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  // handleUpdate vẫn giữ để UpdateContext không break (profile page dùng)
  const handleUpdate = () => setUpdateReady(false);

  if (!hydrated) return null;

  return (
    <UpdateContext.Provider value={{ updateReady, onUpdate: handleUpdate }}>
      <SplashScreen />
      {/* Toast "Đã cập nhật" — hiện sau khi auto-reload, tự tắt sau 4s */}
      <AnimatePresence>
        {justUpdated && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
              left: "50%", transform: "translateX(-50%)",
              zIndex: 9999,
              width: "min(320px, calc(100vw - 32px))",
              background: "linear-gradient(135deg, #0c1a2e, #0f2540)",
              border: "1px solid rgba(16,185,129,0.40)",
              borderRadius: 16,
              padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.40), 0 0 0 1px rgba(16,185,129,0.10)",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Check size={16} style={{ color: "#10b981" }} strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Đã cập nhật</p>
              <p style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", margin: 0, marginTop: 2 }}>
                Phiên bản mới nhất v{APP_VERSION}
              </p>
            </div>
            {/* Progress bar tự thu */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
              style={{
                position: "absolute", bottom: 0, left: 0,
                height: 2, borderRadius: "0 0 16px 16px",
                background: "linear-gradient(90deg, #10b981, #34d399)",
              }}
            />
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
