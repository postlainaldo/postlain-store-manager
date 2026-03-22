"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { RefreshCw } from "lucide-react";

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
    const CURRENT_VERSION = "4";
    const storedVersion = localStorage.getItem("postlain-auth-version");
    if (storedVersion !== CURRENT_VERSION) {
      // Only clear layout/shelf caches, NOT users or currentUser
      try {
        const raw = localStorage.getItem("postlain-store-v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          // Keep: currentUser, storeName, store settings, UI settings
          // Remove only large volatile data that might be stale
          delete parsed?.state?.shelfLayout;
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
      fetch(`/api/profile?id=${state.currentUser.id}`)
        .then(r => { if (r.status === 404) useStore.getState().logout(); })
        .catch(() => {});
    }

    setHydrated(true);

    // ── Push Notification subscription ───────────────────────────
    const registerPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const s = useStore.getState();
      if (!s.currentUser) return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
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
      } catch { /* user denied or browser unsupported */ }
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
    <>
      {children}

      {/* PWA update toast */}
      {updateReady && (
        <div style={{
          position: "fixed",
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          left: "50%", transform: "translateX(-50%)",
          zIndex: 9999,
          background: "#0c1a2e", border: "1px solid #C9A55A",
          borderRadius: 12, padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(12,26,46,0.3)", whiteSpace: "nowrap",
        }}>
          <RefreshCw size={13} style={{ color: "#C9A55A", flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>Có phiên bản mới!</p>
          <button onClick={handleUpdate} style={{
            background: "#C9A55A", border: "none", borderRadius: 7,
            padding: "4px 12px", fontSize: 10, fontWeight: 700,
            color: "#0c1a2e", cursor: "pointer", letterSpacing: "0.06em",
          }}>CẬP NHẬT</button>
          <button onClick={() => setUpdateReady(false)} style={{
            background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, padding: 0,
          }}>×</button>
        </div>
      )}
    </>
  );
}
