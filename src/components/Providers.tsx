"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { RefreshCw } from "lucide-react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // ── Store hydration ──────────────────────────────────────────
    const CURRENT_VERSION = "3";
    const storedVersion = localStorage.getItem("postlain-auth-version");
    if (storedVersion !== CURRENT_VERSION) {
      localStorage.removeItem("postlain-store-v2");
      localStorage.setItem("postlain-auth-version", CURRENT_VERSION);
    }
    useStore.persist.rehydrate();

    const state = useStore.getState();
    const adminUser = state.users.find(u => u.id === "user_admin");
    if (!adminUser || adminUser.email !== "admin" || adminUser.passwordHash !== "Aldo@123") {
      state.updateUser("user_admin", { email: "admin", passwordHash: "Aldo@123" });
    }
    state.fetchDbState();
    setHydrated(true);

    // ── PWA Service Worker update detection ──────────────────────
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        // Check immediately if there's a waiting SW
        if (reg.waiting) {
          setUpdateReady(true);
        }

        // Listen for new SW installing
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New SW waiting — show update banner
              setUpdateReady(true);
            }
          });
        });
      });

      // When a new SW takes control, reload the page to get fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
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
        <div
          style={{
            position: "fixed",
            bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "#0c1a2e",
            border: "1px solid #C9A55A",
            borderRadius: 12,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 32px rgba(12,26,46,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          <RefreshCw size={13} style={{ color: "#C9A55A", flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>Có phiên bản mới!</p>
          <button
            onClick={handleUpdate}
            style={{
              background: "#C9A55A",
              border: "none",
              borderRadius: 7,
              padding: "4px 12px",
              fontSize: 10,
              fontWeight: 700,
              color: "#0c1a2e",
              cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            CẬP NHẬT
          </button>
          <button
            onClick={() => setUpdateReady(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, padding: 0 }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
