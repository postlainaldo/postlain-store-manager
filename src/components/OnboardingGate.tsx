"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Bell, Check, ChevronRight, Share2, PlusSquare, AlertTriangle, RefreshCw, UserCircle } from "lucide-react";
import { useStore, sel } from "@/store/useStore";
import type { AppUser } from "@/store/useStore";

// Only marks install step done — notify step is re-checked every visit via real permission
const LS_INSTALL_KEY = (uid: string) => `onboarding_install_${uid}`;

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ─── Step 0: Complete Profile ─────────────────────────────────────────────────
function StepProfile({ user, onDone }: { user: AppUser; onDone: (updated: Partial<AppUser>) => void }) {
  const [form, setForm] = useState({
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    employeeCode: user.employeeCode ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const missing = {
    name: !form.name.trim(),
    email: !form.email.trim(),
    phone: !form.phone.trim(),
    employeeCode: !form.employeeCode.trim(),
  };
  const hasAnyMissing = Object.values(missing).some(Boolean);

  const handleSave = async () => {
    if (hasAnyMissing) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          employeeCode: form.employeeCode.trim(),
        }),
      });
      if (!res.ok) { setError("Lưu thất bại, thử lại."); setSaving(false); return; }
      onDone({ name: form.name.trim(), phone: form.phone.trim(), employeeCode: form.employeeCode.trim() });
    } catch { setError("Lỗi kết nối."); setSaving(false); }
  };

  const Field = ({ label, value, onChange, placeholder, type = "text" }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "10px 12px", borderRadius: 10, fontSize: 14,
          border: `1.5px solid ${value.trim() ? "#e2e8f0" : "#fca5a5"}`,
          background: value.trim() ? "#f8fafc" : "#fff5f5",
          outline: "none", fontFamily: "inherit", color: "#0f172a",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "#C9A55A"; e.currentTarget.style.background = "#fff"; }}
        onBlur={e => {
          e.currentTarget.style.borderColor = e.currentTarget.value.trim() ? "#e2e8f0" : "#fca5a5";
          e.currentTarget.style.background = e.currentTarget.value.trim() ? "#f8fafc" : "#fff5f5";
        }}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.7 }}>
        Vui lòng điền đầy đủ thông tin trước khi sử dụng hệ thống.
        Thông tin này được dùng để xếp ca, liên lạc và quản lý nhân sự.
      </p>

      <Field label="Họ và tên *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Nguyễn Văn A" />
      <Field label="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@postlain.com" type="email" />
      <Field label="Số điện thoại *" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="0901 234 567" type="tel" />
      <Field label="Mã nhân viên *" value={form.employeeCode} onChange={v => setForm(f => ({ ...f, employeeCode: v }))} placeholder="NV001" />

      {hasAnyMissing && (
        <p style={{ fontSize: 10, color: "#dc2626", margin: 0 }}>* Tất cả các trường đều bắt buộc</p>
      )}
      {error && (
        <div style={{ padding: "9px 12px", borderRadius: 9, background: "#fff1f2", border: "1px solid #fecaca" }}>
          <p style={{ fontSize: 11, color: "#dc2626", margin: 0 }}>{error}</p>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={hasAnyMissing || saving}
        style={{
          padding: "13px", borderRadius: 12, border: "none",
          background: !hasAnyMissing ? "linear-gradient(135deg, #C9A55A, #a07c3a)" : "#e2e8f0",
          color: !hasAnyMissing ? "#fff" : "#94a3b8",
          fontSize: 12, fontWeight: 800,
          cursor: !hasAnyMissing && !saving ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginTop: 4,
        }}
      >
        {saving ? "Đang lưu…" : <><Check size={14} /> Lưu & Tiếp tục</>}
      </motion.button>
    </div>
  );
}

// ─── Step 1: Install PWA ─────────────────────────────────────────────────────
function StepInstall({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop" | null>(null);
  const [installed, setInstalled] = useState(false);
  const [checked, setChecked] = useState(false);

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as { standalone?: boolean }).standalone;

  useEffect(() => {
    if (isStandalone()) setInstalled(true);
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");
  }, []);

  const checkInstall = () => {
    setChecked(true);
    if (isStandalone()) {
      setInstalled(true);
    } else {
      setInstalled(false);
    }
  };

  const STEPS: Record<NonNullable<typeof platform>, string[]> = {
    android: [
      "Mở trang web bằng Chrome trên điện thoại",
      "Nhấn menu ⋮ (3 chấm) góc trên phải màn hình",
      "Chọn \"Thêm vào màn hình chính\" hoặc \"Cài đặt ứng dụng\"",
      "Nhấn \"Cài đặt\" để xác nhận",
      "Đóng trình duyệt → mở app từ màn hình chính",
    ],
    ios: [
      "Mở trang web bằng Safari trên iPhone/iPad",
      "Nhấn nút Chia sẻ (hình vuông có mũi tên lên ↑) ở thanh dưới",
      "Cuộn xuống trong menu, chọn \"Thêm vào Màn hình Chính\"",
      "Nhấn \"Thêm\" ở góc trên phải để xác nhận",
      "Đóng Safari → mở app từ màn hình chính",
    ],
    desktop: [
      "Trên Chrome: nhấn biểu tượng cài đặt ở thanh địa chỉ (góc phải)",
      "Chọn \"Cài đặt POSTLAIN Store Manager\"",
      "Nhấn \"Cài đặt\" để xác nhận",
      "Mở app từ desktop hoặc Start Menu",
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.7 }}>
        Cài app lên thiết bị để dùng đầy đủ tính năng, nhận thông báo và truy cập nhanh hơn.
      </p>

      {/* Platform tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["android", "ios", "desktop"] as const).map(p => (
          <button key={p} onClick={() => setPlatform(p)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 10,
              border: `1.5px solid ${platform === p ? "#C9A55A" : "#e2e8f0"}`,
              background: platform === p ? "rgba(201,165,90,0.08)" : "#f8fafc",
              color: platform === p ? "#C9A55A" : "#64748b",
              fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
            {p === "android" ? "Android" : p === "ios" ? "iOS" : "Máy tính"}
          </button>
        ))}
      </div>

      {/* Steps */}
      {platform && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STEPS[platform].map((s, i) => (
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

      {/* iOS icon legend */}
      {platform === "ios" && (
        <div style={{ display: "flex", gap: 16, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Share2 size={13} style={{ color: "#0ea5e9" }} />
            <span style={{ fontSize: 10, color: "#0369a1" }}>Chia sẻ</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PlusSquare size={13} style={{ color: "#0ea5e9" }} />
            <span style={{ fontSize: 10, color: "#0369a1" }}>Thêm vào MH chính</span>
          </div>
        </div>
      )}

      {/* Check result */}
      {checked && !installed && (
        <div style={{ padding: "11px 14px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: "#ea580c", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "#9a3412", margin: 0, lineHeight: 1.6 }}>
            Chưa phát hiện app được cài. Hãy làm theo hướng dẫn rồi <strong>mở lại từ biểu tượng trên màn hình chính</strong>, sau đó kiểm tra lại.
          </p>
        </div>
      )}

      {installed && (
        <div style={{ padding: "11px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={14} style={{ color: "#16a34a" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Đã cài thành công!</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!installed && (
          <button onClick={checkInstall}
            style={{
              padding: "11px", borderRadius: 10,
              border: "1.5px dashed #cbd5e1", background: "#f8fafc",
              color: "#475569", fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            <RefreshCw size={13} /> Kiểm tra đã cài chưa
          </button>
        )}

        <motion.button whileTap={{ scale: 0.97 }} onClick={onDone}
          disabled={!installed}
          style={{
            padding: "13px", borderRadius: 12, border: "none",
            background: installed ? "linear-gradient(135deg, #C9A55A, #a07c3a)" : "#e2e8f0",
            color: installed ? "#fff" : "#94a3b8",
            fontSize: 12, fontWeight: 800,
            cursor: installed ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          Tiếp theo <ChevronRight size={14} />
        </motion.button>
      </div>
    </div>
  );
}

// ─── Step 2: Enable Push ─────────────────────────────────────────────────────
function StepNotify({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied" | "unsupported">("idle");
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) { setStatus("unsupported"); return; }
    if (Notification.permission === "granted") {
      setStatus("granted");
      doSubscribe(userId); // ensure subscription registered
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    }
  }, []);

  const doSubscribe = async (uid: string) => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, subscription: sub.toJSON() }),
      });
    } catch { /* ignore */ }
  };

  const requestPermission = async () => {
    setStatus("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await doSubscribe(userId);
        setStatus("granted");
      } else {
        setStatus("denied");
      }
    } catch { setStatus("denied"); }
  };

  const sendTest = async () => {
    setTestSent(true);
    await fetch("/api/push/test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "POSTLAIN", body: "Thông báo hoạt động ✓ — bạn sẽ luôn nhận được thông báo quan trọng." }),
    });
  };

  const isGranted = status === "granted";
  const isDenied = status === "denied";
  const isUnsupported = status === "unsupported";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.7 }}>
        Bật thông báo để <strong>luôn nhận được</strong> cập nhật ca làm, yêu cầu được duyệt và thông báo quan trọng — ngay cả khi không mở app.
      </p>

      {/* Unsupported */}
      {isUnsupported && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", margin: "0 0 4px" }}>Trình duyệt không hỗ trợ</p>
            <p style={{ fontSize: 10, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
              Vui lòng dùng <strong>Chrome</strong> (Android/Desktop) hoặc <strong>Safari</strong> (iOS 16.4+) để nhận thông báo.
            </p>
          </div>
        </div>
      )}

      {/* Denied */}
      {isDenied && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fff1f2", border: "1px solid #fecaca" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", margin: 0 }}>Thông báo đang bị chặn</p>
          </div>
          <p style={{ fontSize: 10, color: "#b91c1c", margin: "0 0 8px", lineHeight: 1.7 }}>
            Cần mở lại quyền thủ công:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Chrome Android: Cài đặt → Quyền riêng tư → Cài đặt trang web → Thông báo → store.postlain.com → Cho phép",
              "Chrome Desktop: Nhấn biểu tượng khóa 🔒 ở thanh địa chỉ → Thông báo → Cho phép",
              "Safari iOS: Cài đặt iPhone → Safari → Trang web → Thông báo → store.postlain.com → Cho phép",
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 10, color: "#b91c1c", lineHeight: 1.6 }}>{s}</span>
              </div>
            ))}
          </div>
          <button onClick={requestPermission}
            style={{ marginTop: 12, padding: "9px 14px", borderRadius: 9, border: "none", background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
            Thử lại sau khi đã mở quyền
          </button>
        </div>
      )}

      {/* Granted */}
      {isGranted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={14} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Thông báo đã được bật!</span>
          </div>
          <button onClick={sendTest} disabled={testSent}
            style={{
              padding: "10px 14px", borderRadius: 10,
              border: `1.5px dashed ${testSent ? "#86efac" : "#cbd5e1"}`,
              background: testSent ? "#f0fdf4" : "#f8fafc",
              color: testSent ? "#15803d" : "#475569",
              fontSize: 11, fontWeight: 600, cursor: testSent ? "default" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            {testSent ? <><Check size={13} /> Đã gửi — kiểm tra thiết bị</> : "Gửi thông báo thử nghiệm"}
          </button>
        </div>
      )}

      {/* Request permission button */}
      {(status === "idle" || status === "loading") && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={requestPermission} disabled={status === "loading"}
          style={{
            padding: "13px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
            color: "#fff", fontSize: 12, fontWeight: 800,
            cursor: status === "loading" ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {status === "loading" ? "Đang xử lý…" : <><Bell size={14} /> Bật thông báo</>}
        </motion.button>
      )}

      {/* Done — only available when granted */}
      {isGranted && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={onDone}
          style={{
            padding: "13px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #C9A55A, #a07c3a)",
            color: "#fff", fontSize: 12, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          Hoàn thành <Check size={14} />
        </motion.button>
      )}

      {/* Blocked — cannot proceed */}
      {(isDenied || isUnsupported) && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center" }}>
          <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
            Cần bật thông báo để tiếp tục sử dụng app.<br />
            Làm theo hướng dẫn bên trên rồi nhấn <strong>Thử lại</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Gate ────────────────────────────────────────────────────────────────
// Steps: "profile" → "install" → "notify" → done (null)
type GateStep = "profile" | "install" | "notify" | null;

function needsProfileFill(u: AppUser): boolean {
  return !u.phone?.trim() || !u.employeeCode?.trim() || !u.name?.trim() || !u.email?.trim();
}

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const currentUser = useStore(sel.currentUser);
  const updateUser  = useStore(sel.updateUser);
  const [step, setStep] = useState<GateStep>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!currentUser) { setChecked(true); return; }

    // 1. Profile check (highest priority)
    if (needsProfileFill(currentUser)) {
      setStep("profile");
      setChecked(true);
      return;
    }

    // 2. PWA install check
    const installDone = localStorage.getItem(LS_INSTALL_KEY(currentUser.id)) === "1";

    // 3. Notification check (real permission, not localStorage)
    const notifGranted =
      typeof Notification !== "undefined" && Notification.permission === "granted";

    if (!installDone) {
      setStep("install");
    } else if (!notifGranted) {
      setStep("notify");
    } else {
      setStep(null);
    }
    setChecked(true);
  }, [currentUser?.id, currentUser?.phone, currentUser?.employeeCode]);

  const completeProfile = (updated: Partial<AppUser>) => {
    if (!currentUser) return;
    // Patch store so needsProfileFill re-evaluates
    updateUser(currentUser.id, updated);
    const installDone = localStorage.getItem(LS_INSTALL_KEY(currentUser.id)) === "1";
    const notifGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
    if (!installDone) setStep("install");
    else if (!notifGranted) setStep("notify");
    else setStep(null);
  };

  const completeInstall = () => {
    if (!currentUser) return;
    localStorage.setItem(LS_INSTALL_KEY(currentUser.id), "1");
    const notifGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
    setStep(notifGranted ? null : "notify");
  };

  const completeNotify = () => setStep(null);

  if (!checked) return null;
  if (step === null) return <>{children}</>;

  const STEP_META: Record<NonNullable<GateStep>, { label: string; icon: React.ReactNode; color: string; num: number; total: number }> = {
    profile: { label: "Thông tin cá nhân", icon: <UserCircle size={20} style={{ color: "#0ea5e9" }} />, color: "#0ea5e9", num: 1, total: 3 },
    install: { label: "Cài ứng dụng",      icon: <Smartphone size={20} style={{ color: "#C9A55A" }} />, color: "#C9A55A", num: 2, total: 3 },
    notify:  { label: "Bật thông báo",     icon: <Bell size={20} style={{ color: "#7c3aed" }} />,        color: "#7c3aed", num: 3, total: 3 },
  };
  const meta = STEP_META[step];

  return (
    <>
      {/* Full overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(12,26,46,0.75)", backdropFilter: "blur(10px)" }} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 901,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
        >
          <div style={{
            width: "100%", maxWidth: 420,
            background: "#fff", borderRadius: 20,
            boxShadow: "0 28px 72px rgba(12,26,46,0.3)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
              {/* Progress bar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 4,
                    background: i < meta.num ? "#16a34a" : i === meta.num ? meta.color : "#e2e8f0",
                    transition: "background 0.3s",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: `${meta.color}18`,
                  border: `1.5px solid ${meta.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {meta.icon}
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>
                    Bắt buộc · Bước {meta.num}/{meta.total}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "#0c1a2e", margin: 0 }}>{meta.label}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px 24px", maxHeight: "65vh", overflowY: "auto" }}>
              {step === "profile" && currentUser && <StepProfile user={currentUser} onDone={completeProfile} />}
              {step === "install" && <StepInstall onDone={completeInstall} />}
              {step === "notify"  && <StepNotify userId={currentUser?.id ?? ""} onDone={completeNotify} />}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* App content — completely blocked */}
      <div style={{ visibility: "hidden", pointerEvents: "none" }}>
        {children}
      </div>
    </>
  );
}
