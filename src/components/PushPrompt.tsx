"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Smartphone } from "lucide-react";
import { useStore } from "@/store/useStore";
import { playSound } from "@/hooks/useSFX";

const PROMPT_DEADLINE = new Date("2026-04-10T23:59:59+07:00");
const STORAGE_KEY = "postlain_push_prompted";

export default function PushPrompt() {
  const { currentUser } = useStore();
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Only show if:
    // 1. User is logged in
    // 2. Current date is before deadline
    // 3. Not already prompted/dismissed
    // 4. Browser supports notifications
    // 5. Permission not yet granted
    if (!currentUser) return;
    if (new Date() > PROMPT_DEADLINE) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      localStorage.setItem(STORAGE_KEY, "granted");
      return;
    }
    if (Notification.permission === "denied") {
      localStorage.setItem(STORAGE_KEY, "denied");
      return;
    }

    // Delay slightly so it doesn't appear instantly on load
    const t = setTimeout(() => setShow(true), 2200);
    return () => clearTimeout(t);
  }, [currentUser]);

  async function handleEnable() {
    setSubscribing(true);
    playSound("tap");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        playSound("loginSuccess");
        // Try to subscribe to push if VAPID key available
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidKey && "serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const existing = await reg.pushManager.getSubscription();
            const sub = existing ?? await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
            if (sub && currentUser) {
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser.id, subscription: sub.toJSON() }),
              });
            }
          } catch { /* push subscribe optional */ }
        }
        localStorage.setItem(STORAGE_KEY, "granted");
        setDone(true);
        setTimeout(() => setShow(false), 1800);
      } else {
        localStorage.setItem(STORAGE_KEY, permission);
        setShow(false);
      }
    } catch {
      setShow(false);
    } finally {
      setSubscribing(false);
    }
  }

  function handleDismiss() {
    playSound("modalClose");
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(12,26,46,0.30)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 900,
            }}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.90, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            style={{
              position: "fixed",
              bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(380px, calc(100vw - 32px))",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(24px) saturate(1.8)",
              WebkitBackdropFilter: "blur(24px) saturate(1.8)",
              borderRadius: 20,
              border: "1px solid rgba(186,230,253,0.7)",
              boxShadow: "0 24px 80px rgba(12,26,46,0.18), 0 4px 16px rgba(12,26,46,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
              zIndex: 901,
              overflow: "hidden",
            }}
          >
            {/* Top accent bar */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)", borderRadius: "20px 20px 0 0" }} />

            <div style={{ padding: "18px 20px 20px" }}>
              {done ? (
                /* Success state */
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingBlock: 8 }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "rgba(16,185,129,0.12)", border: "1.5px solid rgba(16,185,129,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Bell size={22} style={{ color: "#10b981" }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e", textAlign: "center" }}>Đã bật thông báo!</p>
                  <p style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>Bạn sẽ nhận được cập nhật quan trọng từ POSTLAIN.</p>
                </motion.div>
              ) : (
                <>
                  {/* Dismiss button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                    <button onClick={handleDismiss}
                      style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <X size={11} style={{ color: "#94a3b8" }} />
                    </button>
                  </div>

                  {/* Icon + content */}
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                      background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.08))",
                      border: "1.5px solid rgba(14,165,233,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Smartphone size={22} style={{ color: "#0ea5e9" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: "#0c1a2e", marginBottom: 5 }}>
                        Bật thông báo đẩy
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                        Nhận thông báo quan trọng từ quản lý, cập nhật ca làm việc và thông tin cửa hàng ngay trên thiết bị của bạn.
                      </p>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18, padding: "12px 14px", background: "rgba(14,165,233,0.04)", borderRadius: 12, border: "1px solid rgba(14,165,233,0.10)" }}>
                    {[
                      "Thông báo ca làm việc & lịch tuần mới",
                      "Tin nhắn khẩn từ quản lý",
                      "Cập nhật quan trọng về cửa hàng",
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0ea5e9", marginTop: 5, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleDismiss}
                      style={{
                        flex: 1, height: 40, borderRadius: 11,
                        border: "1px solid #e2e8f0", background: "#fff",
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: 11, fontWeight: 600, color: "#64748b",
                      }}>
                      Để sau
                    </button>
                    <button onClick={handleEnable} disabled={subscribing}
                      style={{
                        flex: 2, height: 40, borderRadius: 11, border: "none",
                        background: subscribing ? "#bae6fd" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                        cursor: subscribing ? "default" : "pointer",
                        fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        boxShadow: subscribing ? "none" : "0 4px 16px rgba(14,165,233,0.35)",
                        transition: "all 0.15s",
                      }}>
                      <Bell size={13} />
                      {subscribing ? "Đang bật..." : "Bật thông báo"}
                    </button>
                  </div>

                  {/* Deadline note */}
                  <p style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 10 }}>
                    Ưu tiên bật trước 10/04/2026 để nhận thông báo kịp thời
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer as ArrayBuffer;
}
