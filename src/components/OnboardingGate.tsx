"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Bell, Check, ChevronRight, Apple, Chrome, Share2, MoreVertical, PlusSquare, AlertTriangle } from "lucide-react";
import { useStore } from "@/store/useStore";

const LS_KEY = (uid: string) => `onboarding_done_${uid}`;

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ─── Step 1: Install PWA ──────────────────────────────────────────────────────
function StepInstall({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop" | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect if already running as PWA
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone) {
      setInstalled(true);
    }
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");
  }, []);

  const steps: Record<NonNullable<typeof platform>, { icon: React.ReactNode; steps: string[] }> = {
    android: {
      icon: <Chrome size={16} style={{ color: "#4285f4" }} />,
      steps: [
        "Mở trang web bằng Chrome",
        "Nhấn menu ⋮ (3 chấm) góc trên phải",
        "Chọn \"Thêm vào màn hình chính\" hoặc \"Cài đặt ứng dụng\"",
        "Nhấn \"Cài đặt\" để xác nhận",
        "Mở app từ màn hình chính",
      ],
    },
    ios: {
      icon: <Apple size={16} style={{ color: "#000" }} />,
      steps: [
        "Mở trang web bằng Safari",
        "Nhấn nút Chia sẻ  (hình vuông có mũi tên lên)",
        "Cuộn xuống, chọn \"Thêm vào Màn hình chính\"",
        "Nhấn \"Thêm\" để xác nhận",
        "Mở app từ màn hình chính",
      ],
    },
    desktop: {
      icon: <Chrome size={16} style={{ color: "#4285f4" }} />,
      steps: [
        "Trên Chrome: nhấn biểu tượng  ở thanh địa chỉ",
        "Chọn \"Cài đặt POSTLAIN\"",
        "Nhấn \"Cài đặt\" để xác nhận",
        "Mở app từ desktop hoặc Start menu",
      ],
    },
  };

  const cfg = platform ? steps[platform] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Platform selector */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["android", "ios", "desktop"] as const).map(p => (
          <button key={p} onClick={() => setPlatform(p)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 10,
              border: `1.5px solid ${platform === p ? "#C9A55A" : "#e2e8f0"}`,
              background: platform === p ? "rgba(201,165,90,0.08)" : "#f8fafc",
              color: platform === p ? "#C9A55A" : "#64748b",
              fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
            }}>
            {p === "android" ? "Android" : p === "ios" ? "iOS" : "Máy tính"}
          </button>
        ))}
      </div>

      {/* Steps */}
      {cfg && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cfg.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "rgba(201,165,90,0.12)", border: "1.5px solid rgba(201,165,90,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#C9A55A" }}>{i + 1}</span>
              </div>
              <p style={{ fontSize: 11, color: "#334155", margin: 0, lineHeight: 1.6, paddingTop: 2 }}>{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Icons legend for iOS */}
      {platform === "ios" && (
        <div style={{ display: "flex", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Share2 size={14} style={{ color: "#0ea5e9" }} />
            <span style={{ fontSize: 10, color: "#0369a1" }}>Chia sẻ</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PlusSquare size={14} style={{ color: "#0ea5e9" }} />
            <span style={{ fontSize: 10, color: "#0369a1" }}>Thêm vào MH chính</span>
          </div>
        </div>
      )}

      {/* Check */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {installed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac" }}>
            <Check size={14} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Đã cài đặt thành công!</span>
          </div>
        ) : (
          <button onClick={() => {
            if (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone) {
              setInstalled(true);
            } else {
              setInstalled(false);
              // Show hint
              alert("Chưa phát hiện app được cài. Hãy cài theo hướng dẫn rồi mở lại từ màn hình chính.");
            }
          }}
            style={{ padding: "10px", borderRadius: 10, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Kiểm tra đã cài chưa
          </button>
        )}

        <motion.button whileTap={{ scale: 0.97 }}
          onClick={onDone}
          style={{
            padding: "13px", borderRadius: 12, border: "none",
            background: installed ? "linear-gradient(135deg, #C9A55A, #a07c3a)" : "#e2e8f0",
            color: installed ? "#fff" : "#94a3b8",
            fontSize: 12, fontWeight: 800, cursor: installed ? "pointer" : "not-allowed", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          Tiếp theo <ChevronRight size={14} />
        </motion.button>
        {!installed && (
          <button onClick={onDone}
            style={{ background: "none", border: "none", fontSize: 10, color: "#94a3b8", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
            Bỏ qua (không khuyến nghị)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Enable Push ──────────────────────────────────────────────────────
function StepNotify({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (!("Notification" in window)) { setStatus("unsupported"); return; }
    if (Notification.permission === "granted") setStatus("granted");
    else if (Notification.permission === "denied") setStatus("denied");
  }, []);

  const doSubscribe = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(vapidKey) });
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, subscription: sub.toJSON() }) });
    } catch { /* ignore */ }
  };

  const requestPermission = async () => {
    setStatus("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await doSubscribe();
        setStatus("granted");
      } else {
        setStatus("denied");
      }
    } catch { setStatus("denied"); }
  };

  const sendTest = async () => {
    await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "POSTLAIN", body: "Thông báo hoạt động ✓" }) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.7 }}>
        Bật thông báo để nhận cập nhật về ca làm việc, yêu cầu được duyệt, và thông báo quan trọng từ admin — ngay cả khi không mở app.
      </p>

      {status === "unsupported" && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
            Trình duyệt không hỗ trợ push notification. Vui lòng dùng Chrome hoặc Safari.
          </p>
        </div>
      )}

      {status === "denied" && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fff1f2", border: "1px solid #fecaca", display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", margin: "0 0 4px" }}>Thông báo bị chặn</p>
            <p style={{ fontSize: 10, color: "#b91c1c", margin: 0, lineHeight: 1.6 }}>
              Vào <strong>Cài đặt trình duyệt → Quyền trang web → store.postlain.com → Thông báo</strong> → chọn <strong>Cho phép</strong>, sau đó quay lại và thử lại.
            </p>
          </div>
        </div>
      )}

      {status === "granted" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={14} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Đã bật thông báo thành công!</span>
          </div>
          <button onClick={sendTest}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px dashed #86efac", background: "#f0fdf4", color: "#15803d", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Gửi thông báo thử — kiểm tra thiết bị nhận được không
          </button>
          <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, textAlign: "center" }}>
            Có thể tắt từng loại thông báo trong <strong>Cài đặt → Thông báo</strong>
          </p>
        </div>
      )}

      {(status === "idle" || status === "denied") && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={requestPermission}
          style={{
            padding: "13px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
            color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          <Bell size={14} /> Bật thông báo
        </motion.button>
      )}

      {status === "loading" && (
        <div style={{ padding: "13px", borderRadius: 12, background: "#f1f5f9", textAlign: "center", fontSize: 11, color: "#64748b" }}>
          Đang xử lý…
        </div>
      )}

      <motion.button whileTap={{ scale: 0.97 }} onClick={onDone}
        style={{
          padding: "13px", borderRadius: 12, border: "none",
          background: status === "granted" ? "linear-gradient(135deg, #C9A55A, #a07c3a)" : "#e2e8f0",
          color: status === "granted" ? "#fff" : "#94a3b8",
          fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        {status === "granted" ? "Hoàn thành " : "Bỏ qua"} {status === "granted" && <Check size={14} />}
      </motion.button>
    </div>
  );
}

// ─── Main Gate ────────────────────────────────────────────────────────────────
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=hidden, 1=install, 2=notify
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!currentUser) { setChecked(true); return; }
    const done = localStorage.getItem(LS_KEY(currentUser.id));
    if (done === "2") {
      setChecked(true);
    } else {
      const s = Number(done ?? "0") as 0 | 1 | 2;
      setStep(s === 0 ? 1 : s);
      setChecked(true);
    }
  }, [currentUser?.id]);

  const advanceTo = (next: 1 | 2 | 99) => {
    if (!currentUser) return;
    if (next === 99) {
      localStorage.setItem(LS_KEY(currentUser.id), "2");
      setStep(0);
    } else {
      localStorage.setItem(LS_KEY(currentUser.id), String(next - 1));
      setStep(next);
    }
  };

  if (!checked) return null;
  if (step === 0) return <>{children}</>;

  const stepLabel = step === 1 ? "Cài ứng dụng" : "Bật thông báo";
  const stepIcon = step === 1 ? <Smartphone size={20} style={{ color: "#C9A55A" }} /> : <Bell size={20} style={{ color: "#7c3aed" }} />;

  return (
    <>
      {/* Blurred background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 900, backdropFilter: "blur(8px)", background: "rgba(12,26,46,0.6)" }} />

      <AnimatePresence>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 901,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
        >
          <div style={{
            width: "100%", maxWidth: 420,
            background: "#fff", borderRadius: 20,
            boxShadow: "0 24px 64px rgba(12,26,46,0.25)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid #f1f5f9",
              background: "linear-gradient(135deg, #fafbfc, #f1f5f9)",
            }}>
              {/* Progress */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 3,
                    background: i <= step ? (i === 1 ? "#C9A55A" : "#7c3aed") : "#e2e8f0",
                    transition: "background 0.3s",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: step === 1 ? "rgba(201,165,90,0.1)" : "rgba(124,58,237,0.1)",
                  border: `1.5px solid ${step === 1 ? "rgba(201,165,90,0.3)" : "rgba(124,58,237,0.3)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {stepIcon}
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", margin: 0, letterSpacing: 1 }}>BƯỚC {step}/2</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "#0c1a2e", margin: 0 }}>{stepLabel}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px 24px", maxHeight: "65vh", overflowY: "auto" }}>
              {step === 1 && <StepInstall onDone={() => advanceTo(2)} />}
              {step === 2 && <StepNotify userId={currentUser?.id ?? ""} onDone={() => advanceTo(99)} />}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Allow scrolling content behind but block interaction */}
      <div style={{ filter: "blur(2px)", pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
    </>
  );
}
