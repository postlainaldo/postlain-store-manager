"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone, Monitor, Download, Share, Plus, MoreVertical,
  Chrome, CheckCircle2, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "ios" | "android" | "desktop" | null;

interface Step {
  icon: React.ReactNode;
  text: string;
  sub?: string;
}

// ─── Detect platform ──────────────────────────────────────────────────────────

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as { standalone?: boolean }).standalone === true;
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ num, icon, text, sub }: { num: number; icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: "#0ea5e9",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: "#fff", fontSize: 11, fontWeight: 800,
      }}>{num}</div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ color: "#0ea5e9" }}>{icon}</span>
          <p style={{ fontSize: 12, color: "#0c1a2e", fontWeight: 600 }}>{text}</p>
        </div>
        {sub && <p style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Platform guide ───────────────────────────────────────────────────────────

function IOSGuide() {
  const steps: Step[] = [
    { icon: <Share size={13} />, text: 'Nhấn nút "Chia sẻ"', sub: 'Biểu tượng mũi tên hướng lên ở thanh điều hướng Safari (dưới cùng hoặc trên cùng)' },
    { icon: <Plus size={13} />, text: '"Thêm vào Màn hình chính"', sub: 'Cuộn xuống trong menu chia sẻ, tìm và nhấn "Add to Home Screen"' },
    { icon: <CheckCircle2 size={13} />, text: 'Nhấn "Thêm" để xác nhận', sub: 'App sẽ xuất hiện trên màn hình chính như ứng dụng gốc' },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(201,165,90,0.08)", border: "1px solid rgba(201,165,90,0.25)", fontSize: 10, color: "#92712a" }}>
        ⚠️ Chỉ hoạt động trên <b>Safari</b>. Nếu đang dùng Chrome/Firefox trên iPhone, hãy mở link này bằng Safari.
      </div>
      {steps.map((s, i) => <StepCard key={i} num={i + 1} icon={s.icon} text={s.text} sub={s.sub} />)}
    </div>
  );
}

function AndroidGuide() {
  const steps: Step[] = [
    { icon: <Chrome size={13} />, text: 'Mở trong Chrome', sub: 'Đảm bảo bạn đang dùng trình duyệt Chrome trên Android' },
    { icon: <MoreVertical size={13} />, text: 'Nhấn menu "⋮" góc trên phải', sub: 'Ba chấm dọc ở góc trên bên phải màn hình' },
    { icon: <Plus size={13} />, text: '"Thêm vào màn hình chính"', sub: 'Chọn "Add to Home screen" hoặc "Cài đặt ứng dụng" từ menu' },
    { icon: <CheckCircle2 size={13} />, text: 'Xác nhận cài đặt', sub: 'Nhấn "Thêm" — app sẽ được cài vào màn hình chính' },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)", fontSize: 10, color: "#0369a1" }}>
        💡 Chrome có thể tự hiện banner "Cài đặt ứng dụng" ở dưới màn hình — nhấn vào đó để cài nhanh hơn.
      </div>
      {steps.map((s, i) => <StepCard key={i} num={i + 1} icon={s.icon} text={s.text} sub={s.sub} />)}
    </div>
  );
}

function DesktopGuide() {
  const steps: Step[] = [
    { icon: <Chrome size={13} />, text: 'Mở trong Chrome hoặc Edge', sub: 'Đảm bảo dùng Chrome 73+ hoặc Edge 79+' },
    { icon: <Download size={13} />, text: 'Nhấn biểu tượng cài đặt trên thanh địa chỉ', sub: 'Biểu tượng máy tính có dấu "+" ở góc phải thanh địa chỉ (address bar)' },
    { icon: <CheckCircle2 size={13} />, text: 'Nhấn "Cài đặt" để xác nhận', sub: 'App sẽ mở như cửa sổ riêng biệt, xuất hiện trong danh sách ứng dụng' },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)", fontSize: 10, color: "#0369a1" }}>
        💡 Nếu không thấy biểu tượng cài đặt, vào <b>Menu Chrome → Thêm công cụ → Tạo lối tắt</b>
      </div>
      {steps.map((s, i) => <StepCard key={i} num={i + 1} icon={s.icon} text={s.text} sub={s.sub} />)}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; sub: string; icon: React.ReactNode }[] = [
  { id: "ios",     label: "iPhone / iPad", sub: "Safari trên iOS",         icon: <Smartphone size={16} /> },
  { id: "android", label: "Android",       sub: "Chrome trên Android",     icon: <Smartphone size={16} /> },
  { id: "desktop", label: "Máy tính",      sub: "Chrome hoặc Edge",        icon: <Monitor size={16} /> },
];

export default function InstallPage() {
  const router = useRouter();
  const [detected, setDetected] = useState<Platform>(null);
  const [selected, setSelected] = useState<Platform>(null);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setDetected(p);
    setSelected(p);
    setInstalled(isInstalled());

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as Event & { prompt?: () => void }); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setShowSuccess(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt?.prompt) return;
    deferredPrompt.prompt();
    setDeferredPrompt(null);
  };

  const active = selected ?? detected;

  const benefits = [
    { icon: "⚡", text: "Mở nhanh từ màn hình chính" },
    { icon: "📶", text: "Hoạt động khi mất mạng (offline)" },
    { icon: "🔔", text: "Nhận thông báo tồn kho" },
    { icon: "🖥️", text: "Giao diện toàn màn hình, không có thanh địa chỉ" },
  ];

  return (
    <div style={{
      minHeight: "100dvh", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 480, padding: "16px 20px 0",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
          <ArrowLeft size={18} style={{ color: "#64748b" }} />
        </button>
        <p style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.15em", fontWeight: 700 }}>CÀI ĐẶT ỨNG DỤNG</p>
      </div>

      <div style={{ width: "100%", maxWidth: 480, padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Already installed */}
        {installed && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>Đã cài đặt!</p>
              <p style={{ fontSize: 9, color: "#10b981", marginTop: 2 }}>Ứng dụng đang chạy ở chế độ standalone.</p>
            </div>
          </motion.div>
        )}

        {/* Success banner */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)", display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              <p style={{ fontSize: 11, color: "#065f46", fontWeight: 600 }}>Cài đặt thành công! Mở app từ màn hình chính.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* App card */}
        <div style={{
          borderRadius: 20, background: "#fff", border: "1px solid #bae6fd",
          padding: "20px", display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 4px 24px rgba(14,165,233,0.08)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 22 }}>👟</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#0c1a2e", letterSpacing: "-0.02em" }}>POSTLAIN</p>
            <p style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Store Manager · ALDO Vietnam</p>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {["PWA", "Offline", "Miễn phí"].map(tag => (
                <span key={tag} style={{ fontSize: 8, padding: "2px 7px", borderRadius: 20, background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0ea5e9", fontWeight: 700 }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Native install button (Android/Desktop Chrome) */}
        {deferredPrompt && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onClick={handleNativeInstall}
            style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(14,165,233,0.35)", fontFamily: "inherit",
            }}>
            <Download size={16} />
            Cài Đặt Ngay
          </motion.button>
        )}

        {/* Benefits */}
        <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
            <p style={{ fontSize: 8, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>LỢI ÍCH KHI CÀI ĐẶT</p>
          </div>
          <div style={{ padding: "8px 0" }}>
            {benefits.map((b, i) => (
              <div key={i} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <p style={{ fontSize: 11, color: "#0c1a2e" }}>{b.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform selector */}
        <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
            <p style={{ fontSize: 8, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>HƯỚNG DẪN THEO THIẾT BỊ</p>
          </div>
          <div style={{ display: "flex", padding: "10px 12px", gap: 8, borderBottom: "1px solid #e0f2fe" }}>
            {PLATFORMS.map(p => (
              <button key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 10, border: `1.5px solid ${active === p.id ? "#0ea5e9" : "#e0f2fe"}`,
                  background: active === p.id ? "#f0f9ff" : "#fff", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  color: active === p.id ? "#0ea5e9" : "#94a3b8",
                  transition: "all 0.15s", fontFamily: "inherit",
                }}>
                {p.icon}
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.05em" }}>{p.label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: "16px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active ?? "none"}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {active === "ios"     && <IOSGuide />}
                {active === "android" && <AndroidGuide />}
                {active === "desktop" && <DesktopGuide />}
                {!active && <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>Chọn thiết bị của bạn ở trên</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* FAQ */}
        <FAQ />

      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const items = [
    {
      q: "App có chiếm bộ nhớ máy không?",
      a: "Rất ít. PWA chỉ lưu cache nhẹ (dưới 10MB). Không cần tải từ App Store hay Google Play.",
    },
    {
      q: "Dữ liệu có bị mất khi xóa app không?",
      a: "Dữ liệu được lưu trên server. Khi cài lại, đăng nhập lại là có đầy đủ dữ liệu.",
    },
    {
      q: "Có cần internet để dùng không?",
      a: "Một số tính năng cần internet để đồng bộ. Chế độ offline cho phép xem dữ liệu đã cache.",
    },
    {
      q: "Làm sao để cập nhật app?",
      a: "App tự động cập nhật mỗi khi mở — không cần làm gì thêm.",
    },
  ];
  return (
    <div style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #e0f2fe", background: "#f0f9ff" }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>CÂU HỎI THƯỜNG GẶP</p>
      </div>
      {items.map((item, i) => (
        <div key={i}>
          {i > 0 && <div style={{ height: 1, background: "#e0f2fe", margin: "0 16px" }} />}
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontFamily: "inherit", textAlign: "left" }}>
            <p style={{ fontSize: 11, color: "#0c1a2e", fontWeight: 600 }}>{item.q}</p>
            {open === i ? <ChevronUp size={13} style={{ color: "#94a3b8", flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />}
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden" }}>
                <p style={{ padding: "0 16px 12px", fontSize: 10, color: "#64748b", lineHeight: 1.6 }}>{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
