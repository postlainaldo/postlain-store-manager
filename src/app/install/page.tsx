"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone, Monitor, Download, Share, Plus, MoreVertical,
  Chrome, CheckCircle2, ChevronDown, ChevronUp, ArrowLeft,
  Copy, Check, ExternalLink, Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Platform = "ios" | "android" | "desktop" | null;
interface Step { icon: React.ReactNode; text: string; sub?: string; }

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

// ─── Aurora Background ────────────────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #e0f2fe 0%, #ede9fe 50%, #fce7f3 100%)",
      }} />
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        top: -200, left: -160,
        background: "radial-gradient(circle at 40% 40%, rgba(186,230,253,0.85) 0%, rgba(165,180,252,0.50) 50%, transparent 70%)",
        filter: "blur(80px)",
        animation: "orbA 20s ease-in-out infinite alternate",
      }} />
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        bottom: -180, right: -120,
        background: "radial-gradient(circle at 60% 60%, rgba(216,180,254,0.75) 0%, rgba(251,207,232,0.50) 50%, transparent 70%)",
        filter: "blur(80px)",
        animation: "orbB 26s ease-in-out infinite alternate",
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        top: "42%", left: "55%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle, rgba(167,243,208,0.55) 0%, rgba(125,211,252,0.35) 60%, transparent 80%)",
        filter: "blur(90px)",
        animation: "orbC 32s ease-in-out infinite alternate",
      }} />
      <style>{`
        @keyframes orbA {
          0%   { transform: translate(0,0) scale(1.00); }
          33%  { transform: translate(60px,50px) scale(1.12); }
          66%  { transform: translate(30px,90px) scale(0.95); }
          100% { transform: translate(90px,20px) scale(1.08); }
        }
        @keyframes orbB {
          0%   { transform: translate(0,0) scale(1.00); }
          33%  { transform: translate(-55px,-35px) scale(1.10); }
          66%  { transform: translate(-25px,-75px) scale(0.92); }
          100% { transform: translate(-75px,-10px) scale(1.06); }
        }
        @keyframes orbC {
          0%   { transform: translate(-50%,-50%) scale(1.00); }
          50%  { transform: translate(-42%,-62%) scale(1.18); }
          100% { transform: translate(-58%,-42%) scale(0.88); }
        }
      `}</style>
    </div>
  );
}

// ─── Glass Section ─────────────────────────────────────────────────────────────
function GlassSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(28px) saturate(1.8)",
      WebkitBackdropFilter: "blur(28px) saturate(1.8)",
      borderRadius: 20,
      border: "1px solid rgba(186,230,253,0.65)",
      boxShadow: "0 8px 32px rgba(12,26,46,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "10px 18px",
        borderBottom: "1px solid rgba(186,230,253,0.50)",
        background: "rgba(240,249,255,0.70)",
      }}>
        <p style={{ fontSize: 8, fontWeight: 800, color: "#64748b", letterSpacing: "0.22em" }}>{title}</p>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

// ─── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ num, icon, text, sub }: { num: number; icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: "#fff", fontSize: 10, fontWeight: 800,
        boxShadow: "0 2px 8px rgba(14,165,233,0.30)",
      }}>{num}</div>
      <div style={{ flex: 1, paddingTop: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ color: "#0ea5e9" }}>{icon}</span>
          <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{text}</p>
        </div>
        {sub && <p style={{ fontSize: 10, color: "#64748b", lineHeight: 1.55 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Platform Guides ───────────────────────────────────────────────────────────
function IOSGuide() {
  const steps: Step[] = [
    { icon: <Share size={13} />, text: 'Nhấn nút "Chia sẻ"', sub: 'Biểu tượng mũi tên hướng lên ở thanh điều hướng Safari' },
    { icon: <Plus size={13} />, text: '"Thêm vào Màn hình chính"', sub: 'Cuộn xuống trong menu chia sẻ, tìm "Add to Home Screen"' },
    { icon: <CheckCircle2 size={13} />, text: 'Nhấn "Thêm" để xác nhận', sub: 'App xuất hiện trên màn hình chính như ứng dụng gốc' },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(181,242,61,0.08)", border: "1px solid rgba(181,242,61,0.28)", fontSize: 10, color: "#92712a" }}>
        ⚠️ Chỉ hoạt động trên <b>Safari</b>. Nếu đang dùng Chrome/Firefox, mở bằng Safari.
      </div>
      {steps.map((s, i) => <StepCard key={i} num={i + 1} icon={s.icon} text={s.text} sub={s.sub} />)}
    </div>
  );
}
function AndroidGuide() {
  const steps: Step[] = [
    { icon: <Chrome size={13} />, text: 'Mở trong Chrome', sub: 'Đảm bảo đang dùng Chrome trên Android' },
    { icon: <MoreVertical size={13} />, text: 'Nhấn menu "⋮" góc trên phải' },
    { icon: <Plus size={13} />, text: '"Thêm vào màn hình chính"', sub: 'Chọn "Add to Home screen" hoặc "Cài đặt ứng dụng"' },
    { icon: <CheckCircle2 size={13} />, text: 'Xác nhận cài đặt' },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.20)", fontSize: 10, color: "#0369a1" }}>
        💡 Chrome có thể tự hiện banner "Cài đặt ứng dụng" ở dưới màn hình.
      </div>
      {steps.map((s, i) => <StepCard key={i} num={i + 1} icon={s.icon} text={s.text} sub={s.sub} />)}
    </div>
  );
}
function DesktopGuide() {
  const steps: Step[] = [
    { icon: <Chrome size={13} />, text: 'Mở trong Chrome hoặc Edge', sub: 'Chrome 73+ hoặc Edge 79+' },
    { icon: <Download size={13} />, text: 'Nhấn biểu tượng cài đặt trên thanh địa chỉ', sub: 'Biểu tượng máy tính có dấu "+" ở góc phải address bar' },
    { icon: <CheckCircle2 size={13} />, text: 'Nhấn "Cài đặt" để xác nhận' },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.20)", fontSize: 10, color: "#0369a1" }}>
        💡 Nếu không thấy: <b>Menu Chrome → Thêm công cụ → Tạo lối tắt</b>
      </div>
      {steps.map((s, i) => <StepCard key={i} num={i + 1} icon={s.icon} text={s.text} sub={s.sub} />)}
    </div>
  );
}

// ─── QR Block ──────────────────────────────────────────────────────────────────
function QRBlock({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const qrSrc = `https://chart.googleapis.com/chart?chs=160x160&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8`;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{
        width: 80, height: 80, borderRadius: 12,
        border: "1px solid rgba(186,230,253,0.70)",
        background: "#fff", overflow: "hidden", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt="QR" width={72} height={72} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9, color: "#64748b", marginBottom: 6 }}>Quét QR hoặc gửi link cho thiết bị khác:</p>
        <div style={{
          background: "rgba(240,249,255,0.80)", border: "1px solid rgba(186,230,253,0.65)",
          borderRadius: 10, padding: "7px 10px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <p style={{ fontSize: 10, color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</p>
          <button onClick={copy} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}>
            {copied ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} style={{ color: "#94a3b8" }} />}
          </button>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 9, color: "#0ea5e9", display: "flex", alignItems: "center", gap: 3, marginTop: 6, textDecoration: "none" }}>
          <ExternalLink size={9} /> Mở trong tab mới
        </a>
      </div>
    </div>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const items = [
    { q: "App có chiếm bộ nhớ máy không?", a: "Rất ít. PWA chỉ lưu cache nhẹ (dưới 10MB). Không cần tải từ App Store hay Play Store." },
    { q: "Dữ liệu có bị mất khi xóa app không?", a: "Dữ liệu lưu trên server. Khi cài lại, đăng nhập lại là có đầy đủ dữ liệu." },
    { q: "Có cần internet để dùng không?", a: "Cần kết nối tới server. Trong nội bộ (LAN), chỉ cần chung WiFi là đủ." },
    { q: "Làm sao để cập nhật app?", a: "App tự cập nhật mỗi khi mở — không cần làm gì thêm." },
    { q: "Cài được trên bao nhiêu thiết bị?", a: "Không giới hạn. Gửi link /install cho bất kỳ thiết bị nào trong cùng mạng." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {items.map((item, i) => (
        <div key={i}>
          {i > 0 && <div style={{ height: 1, background: "rgba(186,230,253,0.45)" }} />}
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", padding: "12px 0", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontFamily: "inherit", textAlign: "left" }}>
            <p style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>{item.q}</p>
            {open === i
              ? <ChevronUp size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
              : <ChevronDown size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />}
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                <p style={{ paddingBottom: 12, fontSize: 10, color: "#64748b", lineHeight: 1.6 }}>{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
const PLATFORMS: { id: Platform; label: string; sub: string; icon: React.ReactNode }[] = [
  { id: "ios",     label: "iPhone / iPad", sub: "Safari · iOS",     icon: <Smartphone size={15} /> },
  { id: "android", label: "Android",       sub: "Chrome",           icon: <Smartphone size={15} /> },
  { id: "desktop", label: "Máy tính",      sub: "Chrome / Edge",    icon: <Monitor size={15} /> },
];

export default function InstallPage() {
  const router = useRouter();
  const [detected,       setDetected]       = useState<Platform>(null);
  const [selected,       setSelected]       = useState<Platform>(null);
  const [installed,      setInstalled]      = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [showSuccess,    setShowSuccess]    = useState(false);
  const [appUrl,         setAppUrl]         = useState("");

  useEffect(() => {
    const p = detectPlatform();
    setDetected(p);
    setSelected(p);
    setInstalled(isInstalled());
    if (typeof window !== "undefined") setAppUrl(window.location.origin + "/install");
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
    { icon: "⚡", text: "Mở nhanh từ màn hình chính, không cần trình duyệt" },
    { icon: "📶", text: "Hoạt động trong mạng nội bộ (LAN)" },
    { icon: "🖥️", text: "Giao diện toàn màn hình, không thanh địa chỉ" },
    { icon: "📦", text: "Quản lý kho, trưng bày, nhân sự trên mọi thiết bị" },
  ];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0 48px", position: "relative" }}>
      <AuroraBackground />

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 480, padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.92 }}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(186,230,253,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
          <ArrowLeft size={16} style={{ color: "#64748b" }} />
        </motion.button>
        <p style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.22em", fontWeight: 800 }}>CÀI ĐẶT ỨNG DỤNG</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 480, padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 1 }}
      >

        {/* Already installed banner */}
        <AnimatePresence>
          {installed && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                padding: "12px 18px", borderRadius: 16,
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.30)",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
              <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>Đã cài đặt!</p>
                <p style={{ fontSize: 9, color: "#10b981", marginTop: 1 }}>Đang chạy ở chế độ standalone.</p>
              </div>
            </motion.div>
          )}
          {showSuccess && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{
                padding: "12px 18px", borderRadius: 16,
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.30)",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
              <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              <p style={{ fontSize: 11, color: "#065f46", fontWeight: 600 }}>Cài đặt thành công! Mở app từ màn hình chính.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* App card */}
        <div style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(28px) saturate(1.8)", WebkitBackdropFilter: "blur(28px) saturate(1.8)",
          borderRadius: 24, border: "1px solid rgba(186,230,253,0.65)",
          boxShadow: "0 16px 48px rgba(12,26,46,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
          padding: 20, display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, flexShrink: 0,
            background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
            border: "1.5px solid rgba(14,165,233,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(14,165,233,0.18)",
          }}>
            <span style={{ fontSize: 28 }}>👟</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#0284c7", letterSpacing: "-0.02em" }}>POSTLAIN</p>
            <p style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Store Manager · ALDO Vietnam</p>
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              {["PWA", "Offline-ready", "Miễn phí"].map(tag => (
                <span key={tag} style={{
                  fontSize: 8, padding: "2px 8px", borderRadius: 20,
                  background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.22)",
                  color: "#0ea5e9", fontWeight: 700,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Native install button */}
        <AnimatePresence>
          {deferredPrompt && (
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={handleNativeInstall}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", height: 52, borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 6px 24px rgba(14,165,233,0.38)", fontFamily: "inherit",
                letterSpacing: "0.12em",
              }}>
              <Download size={15} /> CÀI ĐẶT NGAY
            </motion.button>
          )}
        </AnimatePresence>

        {/* QR + Share */}
        {appUrl && (
          <GlassSection title="CHIA SẺ LINK CÀI ĐẶT">
            <QRBlock url={appUrl} />
          </GlassSection>
        )}

        {/* Network info */}
        <GlassSection title="THÔNG TIN KẾT NỐI">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Wifi size={14} style={{ color: "#0ea5e9", flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: "#64748b", lineHeight: 1.55, marginBottom: 8 }}>
                Đảm bảo thiết bị cần cài và máy chủ đang <b>chung mạng WiFi</b> (hoặc truy cập qua internet nếu có domain).
              </p>
              {appUrl && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { label: "Link cài app",    value: appUrl },
                    { label: "Link đăng nhập", value: appUrl.replace("/install", "/login") },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontSize: 9, color: "#94a3b8", width: 90, flexShrink: 0 }}>{row.label}</span>
                      <span style={{ fontSize: 10, color: "var(--text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlassSection>

        {/* Benefits */}
        <GlassSection title="LỢI ÍCH KHI CÀI ĐẶT">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {benefits.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16 }}>{b.icon}</span>
                <p style={{ fontSize: 11, color: "var(--text-primary)" }}>{b.text}</p>
              </div>
            ))}
          </div>
        </GlassSection>

        {/* Platform guide */}
        <div style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(28px) saturate(1.8)", WebkitBackdropFilter: "blur(28px) saturate(1.8)",
          borderRadius: 20, border: "1px solid rgba(186,230,253,0.65)",
          boxShadow: "0 8px 32px rgba(12,26,46,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(186,230,253,0.50)", background: "rgba(240,249,255,0.70)" }}>
            <p style={{ fontSize: 8, fontWeight: 800, color: "#64748b", letterSpacing: "0.22em" }}>HƯỚNG DẪN THEO THIẾT BỊ</p>
          </div>
          {/* Platform selector */}
          <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderBottom: "1px solid rgba(186,230,253,0.40)" }}>
            {PLATFORMS.map(p => (
              <button key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 12,
                  border: `1.5px solid ${active === p.id ? "rgba(14,165,233,0.55)" : "rgba(186,230,253,0.60)"}`,
                  background: active === p.id ? "rgba(14,165,233,0.10)" : "rgba(255,255,255,0.60)",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  color: active === p.id ? "#0ea5e9" : "#94a3b8",
                  transition: "all 0.15s", fontFamily: "inherit",
                  boxShadow: active === p.id ? "0 0 0 3px rgba(14,165,233,0.12)" : "none",
                }}>
                {p.icon}
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.06em" }}>{p.label}</span>
              </button>
            ))}
          </div>
          {/* Guide content */}
          <div style={{ padding: 18 }}>
            <AnimatePresence mode="wait">
              <motion.div key={active ?? "none"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                {active === "ios"     && <IOSGuide />}
                {active === "android" && <AndroidGuide />}
                {active === "desktop" && <DesktopGuide />}
                {!active && <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>Chọn thiết bị ở trên</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* FAQ */}
        <GlassSection title="CÂU HỎI THƯỜNG GẶP">
          <FAQ />
        </GlassSection>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 9, color: "rgba(12,26,46,0.28)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
          POSTLAIN Store Manager · v1.0
        </p>

      </motion.div>
    </div>
  );
}
