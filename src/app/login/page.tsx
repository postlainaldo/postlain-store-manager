"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  Eye, EyeOff, Lock, User, AlertCircle, Check, ArrowRight,
  Shield, Wifi, WifiOff, Sparkles, Store, ChevronRight,
  MessageCircle, FileText, ShieldCheck, X,
} from "lucide-react";
import { useStore, sel } from "@/store/useStore";
import { useSFX, unlockAudio } from "@/hooks/useSFX";

// ─── Floating particle ────────────────────────────────────────────────────────

function Particle({ delay, duration, size, x, y, color }: {
  delay: number; duration: number; size: number; x: number; y: number; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x, y: y + 40, scale: 0 }}
      animate={{
        opacity: [0, 0.6, 0.4, 0],
        y: [y + 40, y - 80],
        x: [x, x + (Math.random() > 0.5 ? 30 : -30)],
        scale: [0, 1, 0.8, 0],
        rotate: [0, 180, 360],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
      style={{
        position: "absolute",
        width: size, height: size,
        borderRadius: size > 5 ? "50%" : 2,
        background: color,
        pointerEvents: "none",
        filter: "blur(0.5px)",
      }}
    />
  );
}

// ─── Animated grid lines ──────────────────────────────────────────────────────

function GridLines() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(14,165,233,0.5)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="gridFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="gridMask">
            <rect width="100%" height="100%" fill="url(#gridFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" mask="url(#gridMask)" />
      </svg>
    </div>
  );
}

// ─── Aurora orbs background ───────────────────────────────────────────────────

function AuroraBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Base — very dark deep navy */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #040d1a 0%, #060d1e 40%, #050912 100%)",
      }} />

      {/* Orb 1 — primary blue nebula */}
      <motion.div
        animate={{ x: [0, 55, 20, 70, 0], y: [0, 35, 75, 15, 0], scale: [1, 1.12, 0.95, 1.08, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 800, height: 800,
          borderRadius: "50%",
          top: -280, left: -200,
          background: "radial-gradient(circle at 40% 40%, rgba(14,165,233,0.18) 0%, rgba(56,189,248,0.10) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Orb 2 — violet accent */}
      <motion.div
        animate={{ x: [0, -45, -70, -20, 0], y: [0, -50, -20, -65, 0], scale: [1, 0.92, 1.15, 0.98, 1] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 650, height: 650,
          borderRadius: "50%",
          bottom: -200, right: -160,
          background: "radial-gradient(circle at 60% 60%, rgba(139,92,246,0.20) 0%, rgba(167,139,250,0.10) 45%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Orb 3 — gold shimmer center */}
      <motion.div
        animate={{ scale: [1, 1.25, 0.88, 1.10, 1], opacity: [0.5, 0.8, 0.45, 0.70, 0.5] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 350, height: 350,
          borderRadius: "50%",
          top: "38%", left: "52%",
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(201,165,90,0.14) 0%, rgba(251,191,36,0.07) 55%, transparent 75%)",
          filter: "blur(80px)",
        }}
      />

      {/* Orb 4 — teal accent bottom-left */}
      <motion.div
        animate={{ x: [0, 40, 10, 50, 0], y: [0, -30, -55, -15, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 420, height: 420,
          borderRadius: "50%",
          bottom: -100, left: -80,
          background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)",
          filter: "blur(65px)",
        }}
      />

      {/* Grid overlay */}
      <GridLines />

      {/* Scan line sweep */}
      <motion.div
        animate={{ y: ["-8%", "108%"] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
        style={{
          position: "absolute", left: 0, right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, rgba(14,165,233,0.25) 30%, rgba(14,165,233,0.50) 50%, rgba(14,165,233,0.25) 70%, transparent 100%)",
          filter: "blur(1px)",
          boxShadow: "0 0 12px rgba(14,165,233,0.30)",
        }}
      />

      {/* Floating particles */}
      {[
        { x: 80,  y: 520, size: 3, color: "rgba(14,165,233,0.55)",  delay: 0,   dur: 7  },
        { x: 180, y: 450, size: 2, color: "rgba(139,92,246,0.55)",  delay: 1.2, dur: 9  },
        { x: 320, y: 600, size: 4, color: "rgba(201,165,90,0.45)",  delay: 0.6, dur: 6  },
        { x: 420, y: 480, size: 2, color: "rgba(16,185,129,0.50)",  delay: 2.1, dur: 8  },
        { x: 60,  y: 350, size: 3, color: "rgba(56,189,248,0.50)",  delay: 3.5, dur: 7.5 },
        { x: 290, y: 550, size: 2, color: "rgba(167,139,250,0.55)", delay: 1.8, dur: 10 },
        { x: 480, y: 400, size: 3, color: "rgba(14,165,233,0.40)",  delay: 4.2, dur: 8.5 },
        { x: 140, y: 620, size: 2, color: "rgba(201,165,90,0.50)",  delay: 0.9, dur: 9.5 },
        { x: 380, y: 520, size: 4, color: "rgba(16,185,129,0.40)",  delay: 2.7, dur: 7.2 },
        { x: 520, y: 560, size: 2, color: "rgba(139,92,246,0.45)",  delay: 5.1, dur: 8.8 },
        { x: 220, y: 390, size: 3, color: "rgba(56,189,248,0.45)",  delay: 1.4, dur: 6.5 },
        { x: 460, y: 300, size: 2, color: "rgba(251,191,36,0.40)",  delay: 3.0, dur: 9.2 },
      ].map((p, i) => (
        <Particle key={i} x={p.x} y={p.y} size={p.size} color={p.color} delay={p.delay} duration={p.dur} />
      ))}
    </div>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
    password.length >= 12,
  ].filter(Boolean).length;

  const labels = ["", "Rất yếu", "Yếu", "Trung bình", "Tốt", "Mạnh"];
  const colors = ["", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#0ea5e9"];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: "hidden" }}
    >
      <div style={{ padding: "6px 4px 2px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <motion.div
              key={n}
              animate={{ opacity: n <= score ? 1 : 0.25 }}
              style={{
                flex: 1, height: 3, borderRadius: 4,
                background: n <= score ? colors[score] : "rgba(255,255,255,0.08)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 9, color: colors[score] || "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>
          {labels[score]}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Capslock detector ────────────────────────────────────────────────────────

function useCapsLock() {
  const [caps, setCaps] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.getModifierState) setCaps(e.getModifierState("CapsLock"));
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    return () => { window.removeEventListener("keydown", handler); window.removeEventListener("keyup", handler); };
  }, []);
  return caps;
}

// ─── Online status ────────────────────────────────────────────────────────────

function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

// ─── Input field ─────────────────────────────────────────────────────────────

function Field({
  focused, icon: Icon, error,
  children,
}: {
  focused: boolean;
  icon: React.ElementType;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 10,
      background: focused
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.03)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      border: `1px solid ${
        error ? "rgba(239,68,68,0.55)"
        : focused ? "rgba(14,165,233,0.50)"
        : "rgba(255,255,255,0.08)"
      }`,
      borderRadius: 14, padding: "0 16px", height: 52,
      transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
      boxShadow: error
        ? "0 0 0 3px rgba(239,68,68,0.10)"
        : focused
          ? "0 0 0 3px rgba(14,165,233,0.10), 0 2px 12px rgba(14,165,233,0.08)"
          : "none",
    }}>
      {/* Left accent line */}
      <motion.div
        animate={{ opacity: focused ? 1 : 0, scaleY: focused ? 1 : 0.4 }}
        style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
          width: 2.5, height: "55%", borderRadius: 2,
          background: error ? "#ef4444" : "linear-gradient(180deg, #0ea5e9, #7c3aed)",
        }}
      />
      <Icon
        size={14}
        style={{
          color: error ? "#ef4444" : focused ? "#0ea5e9" : "rgba(255,255,255,0.30)",
          flexShrink: 0,
          transition: "color 0.2s",
        }}
      />
      {children}
    </div>
  );
}

// ─── Footer links with modal ──────────────────────────────────────────────────

const FOOTER_CONTENT = {
  support: {
    icon: MessageCircle,
    title: "Hỗ trợ",
    color: "#38bdf8",
    sections: [
      {
        heading: "Liên hệ",
        items: [
          "Zalo / điện thoại: liên hệ quản lý cửa hàng",
          "Sự cố hệ thống: báo ngay cho admin",
        ],
      },
      {
        heading: "Câu hỏi thường gặp",
        items: [
          "Quên mật khẩu → liên hệ admin để đặt lại",
          "Không vào được → kiểm tra kết nối mạng",
          "Lỗi dữ liệu → chụp màn hình và báo admin",
        ],
      },
    ],
  },
  terms: {
    icon: FileText,
    title: "Điều khoản sử dụng",
    color: "#a78bfa",
    sections: [
      {
        heading: "Phạm vi sử dụng",
        items: [
          "Hệ thống chỉ dành cho nhân viên POSTLAIN được cấp phép",
          "Không chia sẻ tài khoản với người không thuộc cửa hàng",
          "Mọi hành động trong hệ thống được ghi lại nhật ký",
        ],
      },
      {
        heading: "Trách nhiệm",
        items: [
          "Bảo mật thông tin đăng nhập là trách nhiệm cá nhân",
          "Không sử dụng hệ thống vào mục đích ngoài công việc",
          "Vi phạm có thể dẫn đến thu hồi quyền truy cập",
        ],
      },
    ],
  },
  privacy: {
    icon: ShieldCheck,
    title: "Chính sách bảo mật",
    color: "#34d399",
    sections: [
      {
        heading: "Dữ liệu thu thập",
        items: [
          "Tên đăng nhập và hoạt động trong hệ thống",
          "Thông tin thiết bị và thời gian truy cập",
          "Dữ liệu nghiệp vụ: đơn hàng, kho, lịch làm việc",
        ],
      },
      {
        heading: "Bảo vệ dữ liệu",
        items: [
          "Mật khẩu được mã hóa, không lưu dạng plaintext",
          "Kết nối HTTPS/TLS 1.3 cho toàn bộ traffic",
          "Dữ liệu lưu trên server nội bộ, không bán cho bên thứ ba",
        ],
      },
    ],
  },
};

function FooterLinks() {
  const [open, setOpen] = useState<keyof typeof FOOTER_CONTENT | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const active = open ? FOOTER_CONTENT[open] : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
        {(["support", "terms", "privacy"] as const).map((key, i) => {
          const item = FOOTER_CONTENT[key];
          const Icon = item.icon;
          return (
            <span key={key} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && (
                <span style={{ width: 1, height: 10, background: "rgba(148,163,184,0.12)", margin: "0 10px", display: "block" }} />
              )}
              <motion.button
                onClick={() => setOpen(key)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                  borderRadius: 8,
                }}
              >
                <Icon size={9} style={{ color: "rgba(148,163,184,0.30)" }} />
                <span style={{ fontSize: 8.5, color: "rgba(148,163,184,0.32)", letterSpacing: "0.05em" }}>
                  {item.title}
                </span>
              </motion.button>
            </span>
          );
        })}
      </div>

      {/* Modal overlay — rendered via portal to escape perspective/transform ancestors */}
      {mounted && createPortal(
        <AnimatePresence>
          {active && <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(null)}
              style={{
                position: "fixed", inset: 0, zIndex: 300,
                background: "rgba(0,0,0,0.60)",
                backdropFilter: "blur(6px)",
              }}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed", left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 301,
                width: "calc(100vw - 48px)", maxWidth: 380,
                background: "rgba(8,18,36,0.96)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 24,
                boxShadow: "0 32px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04)",
                overflow: "hidden",
              }}
            >
              {/* Modal header */}
              <div style={{
                padding: "20px 22px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: `linear-gradient(135deg, rgba(${active.color === "#38bdf8" ? "56,189,248" : active.color === "#a78bfa" ? "167,139,250" : "52,211,153"},0.08) 0%, transparent 100%)`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: `rgba(${active.color === "#38bdf8" ? "56,189,248" : active.color === "#a78bfa" ? "167,139,250" : "52,211,153"},0.12)`,
                    border: `1px solid rgba(${active.color === "#38bdf8" ? "56,189,248" : active.color === "#a78bfa" ? "167,139,250" : "52,211,153"},0.25)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <active.icon size={15} style={{ color: active.color }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.01em" }}>
                      {active.title}
                    </h3>
                    <p style={{ fontSize: 9, color: "rgba(148,163,184,0.40)", letterSpacing: "0.04em" }}>
                      POSTLAIN Store Manager
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setOpen(null)}
                  whileHover={{ scale: 1.1, background: "rgba(255,255,255,0.10)" }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", outline: "none",
                  }}
                >
                  <X size={12} style={{ color: "rgba(148,163,184,0.60)" }} />
                </motion.button>
              </div>

              {/* Modal body */}
              <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                {active.sections.map(section => (
                  <div key={section.heading}>
                    <p style={{
                      fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em",
                      color: active.color, textTransform: "uppercase", marginBottom: 8,
                    }}>
                      {section.heading}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {section.items.map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <div style={{
                            width: 4, height: 4, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                            background: `rgba(${active.color === "#38bdf8" ? "56,189,248" : active.color === "#a78bfa" ? "167,139,250" : "52,211,153"},0.50)`,
                          }} />
                          <span style={{ fontSize: 10.5, color: "rgba(148,163,184,0.70)", lineHeight: 1.55 }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

import { Suspense } from "react";

function LoginInner() {
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const login          = useStore(sel.login);
  const setStoreId     = useStore(sel.setCurrentStoreId);
  const currentStoreId = useStore(sel.currentStoreId);
  const sfx            = useSFX();
  const capsOn         = useCapsLock();
  const online         = useOnlineStatus();

  const [storeName, setStoreName] = useState<string | null>(null);

  // Fetch tên store để hiển thị
  useEffect(() => {
    if (!currentStoreId) return;
    fetch("/api/stores")
      .then(r => r.json())
      .then((stores: { id: string; name: string }[]) => {
        const found = stores.find(s => s.id === currentStoreId);
        if (found) setStoreName(found.name);
      })
      .catch(() => {});
  }, [currentStoreId]);

  // Set storeId từ URL param khi load trang
  useEffect(() => {
    const storeParam = searchParams.get("store");
    if (storeParam) setStoreId(storeParam);
  }, [searchParams, setStoreId]);

  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [focusUser,   setFocusUser]   = useState(false);
  const [focusPw,     setFocusPw]     = useState(false);
  const [attempts,    setAttempts]    = useState(0);
  const [locked,      setLocked]      = useState(false);
  const [lockTimer,   setLockTimer]   = useState(0);

  // Card tilt effect on mouse move
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(my, { stiffness: 120, damping: 22 });
  const rotY = useSpring(mx, { stiffness: 120, damping: 22 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    mx.set(((e.clientX - cx) / rect.width)  *  8);
    my.set(((e.clientY - cy) / rect.height) * -8);
  }, [mx, my]);

  const handleMouseLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  // Lockout countdown
  useEffect(() => {
    if (!locked) return;
    setLockTimer(30);
    const interval = setInterval(() => {
      setLockTimer(t => {
        if (t <= 1) { setLocked(false); setAttempts(0); clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  // Load remembered username
  useEffect(() => {
    try {
      const saved = localStorage.getItem("plsm_remember");
      if (saved) { setUsername(saved); setRememberMe(true); }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success || locked) return;
    if (!online) { sfx("error"); setError("Không có kết nối mạng"); return; }
    setError("");
    setLoading(true);
    sfx("loginSubmit");
    await new Promise(r => setTimeout(r, 280));
    const ok = await login(username.trim(), password);
    if (ok) {
      sfx("loginSuccess");
      setSuccess(true);
      if (rememberMe) {
        try { localStorage.setItem("plsm_remember", username.trim()); } catch {}
      } else {
        try { localStorage.removeItem("plsm_remember"); } catch {}
      }
      await new Promise(r => setTimeout(r, 600));
      router.replace("/");
    } else {
      sfx("error");
      setLoading(false);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLocked(true);
        setError("Quá nhiều lần thử sai. Vui lòng chờ 30 giây.");
      } else {
        setError(`Tên đăng nhập hoặc mật khẩu không đúng (${newAttempts}/5)`);
      }
    }
  };

  return (
    <div
      onClick={() => unlockAudio()}
      style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}
    >
      <AuroraBackground />

      {/* Offline banner */}
      <AnimatePresence>
        {!online && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            style={{
              position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
              zIndex: 100,
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 12,
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.35)",
              backdropFilter: "blur(12px)",
            }}
          >
            <WifiOff size={13} style={{ color: "#ef4444" }} />
            <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Không có kết nối mạng</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success flash */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.6 }}
            style={{ position: "fixed", inset: 0, background: "rgba(14,165,233,0.18)", zIndex: 200, pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      {/* Card wrapper — 3D tilt */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: "100%", maxWidth: 420,
          position: "relative", zIndex: 1,
          perspective: 900,
          rotateX: rotX,
          rotateY: rotY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* ── Logo mark ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* Rotating glow ring behind logo */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: -6,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 0%, rgba(14,165,233,0.55) 25%, transparent 50%, rgba(139,92,246,0.45) 75%, transparent 100%)",
                filter: "blur(3px)",
              }}
            />
            <motion.div
              animate={success ? { scale: [1, 1.25, 1] } : { scale: [1, 1.04, 1] }}
              transition={success ? { duration: 0.4 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "relative",
                width: 68, height: 68, borderRadius: 22,
                background: "linear-gradient(135deg, #0a1628 0%, #0f2040 50%, #0a1628 100%)",
                border: "1.5px solid rgba(14,165,233,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 40px rgba(14,165,233,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              {/* Shimmer inside logo */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.15), transparent)",
                  borderRadius: 22,
                  pointerEvents: "none",
                }}
              />
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="check"
                    initial={{ scale: 0, rotate: -90, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  >
                    <Check size={26} style={{ color: "#10b981" }} strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.span key="p"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.4, rotate: 90 }}
                    style={{ fontSize: 28, fontWeight: 900, color: "#e0f2fe", letterSpacing: "-0.04em" }}
                  >
                    P
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.p
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: 13, fontWeight: 900, color: "#7dd3fc", letterSpacing: "0.42em" }}
          >
            POSTLAIN
          </motion.p>
          <p style={{ fontSize: 8.5, color: "rgba(148,163,184,0.55)", letterSpacing: "0.20em", marginTop: 5, textTransform: "uppercase" }}>
            Store Manager
          </p>

          {/* Store badge + đổi cửa hàng */}
          {storeName && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: "flex", justifyContent: "center", marginTop: 12 }}
            >
              <motion.button
                onClick={() => { setStoreId(null as unknown as string); router.push("/store-select"); }}
                whileHover={{ scale: 1.04, backgroundColor: "rgba(201,165,90,0.18)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: "rgba(201,165,90,0.10)",
                  border: "1px solid rgba(201,165,90,0.28)",
                  borderRadius: 24, padding: "5px 12px 5px 9px",
                  cursor: "pointer", outline: "none",
                  transition: "background 0.2s, border-color 0.2s",
                  boxShadow: "0 2px 12px rgba(201,165,90,0.10)",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "rgba(201,165,90,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Store size={9} style={{ color: "#c9a55a" }} />
                </div>
                <span style={{ fontSize: 9.5, color: "#c9a55a", fontWeight: 700, letterSpacing: "0.08em", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {storeName}
                </span>
                <div style={{
                  display: "flex", alignItems: "center", gap: 2,
                  paddingLeft: 4, borderLeft: "1px solid rgba(201,165,90,0.20)",
                  marginLeft: 1,
                }}>
                  <span style={{ fontSize: 8, color: "rgba(201,165,90,0.55)", letterSpacing: "0.06em" }}>đổi</span>
                  <ChevronRight size={8} style={{ color: "rgba(201,165,90,0.45)" }} />
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* Online indicator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1, 0.85] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: online ? "#10b981" : "#ef4444",
                boxShadow: online ? "0 0 8px rgba(16,185,129,0.8)" : "0 0 8px rgba(239,68,68,0.8)",
              }}
            />
            <span style={{ fontSize: 9, color: online ? "rgba(16,185,129,0.70)" : "rgba(239,68,68,0.70)", letterSpacing: "0.08em" }}>
              {online ? "Đã kết nối" : "Ngoại tuyến"}
            </span>
          </div>
        </div>

        {/* ── Main glass card ── */}
        <div style={{
          background: "rgba(8,16,32,0.82)",
          backdropFilter: "blur(32px) saturate(1.6)",
          WebkitBackdropFilter: "blur(32px) saturate(1.6)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 8px 32px rgba(14,165,233,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
          padding: "30px 26px 26px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Topbar accent line */}
          <div style={{
            position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.50), rgba(139,92,246,0.40), transparent)",
          }} />

          {/* Corner glint */}
          <div style={{
            position: "absolute", top: -30, right: -30,
            width: 120, height: 120, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 300, color: "#e2e8f0", letterSpacing: "-0.02em", marginBottom: 3 }}>
                Đăng nhập
              </h2>
              <p style={{ fontSize: 10.5, color: "rgba(148,163,184,0.55)", letterSpacing: "0.04em" }}>
                Xác thực để tiếp tục
              </p>
            </div>
            {/* Security badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 20,
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.18)",
            }}>
              <Shield size={10} style={{ color: "#10b981" }} />
              <span style={{ fontSize: 8.5, color: "rgba(16,185,129,0.80)", fontWeight: 600, letterSpacing: "0.06em" }}>SSL</span>
            </div>
          </div>

          {/* Error / lockout */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 14 }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)",
                }}>
                  <AlertCircle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10.5, color: "#ef4444" }}>{error}</p>
                    {locked && (
                      <motion.p
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ fontSize: 9.5, color: "rgba(239,68,68,0.70)", marginTop: 3 }}
                      >
                        Mở khóa sau {lockTimer}s
                      </motion.p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CapsLock warning */}
          <AnimatePresence>
            {capsOn && focusPw && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 10 }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 10,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)",
                }}>
                  <Sparkles size={11} style={{ color: "#f59e0b" }} />
                  <span style={{ fontSize: 10, color: "rgba(245,158,11,0.85)" }}>Caps Lock đang bật</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 11 }}>

            {/* Username */}
            <Field focused={focusUser} icon={User}>
              <input
                type="text" value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                onFocus={() => setFocusUser(true)}
                onBlur={() => setFocusUser(false)}
                placeholder="Tên đăng nhập"
                required autoComplete="username"
                disabled={locked}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 16, color: "#e2e8f0", fontFamily: "inherit",
                  opacity: locked ? 0.4 : 1,
                }}
              />
              {username && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check size={11} style={{ color: "rgba(16,185,129,0.65)" }} />
                </motion.div>
              )}
            </Field>

            {/* Password */}
            <div>
              <Field focused={focusPw} icon={Lock} error={!!error && focusPw}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onFocus={() => setFocusPw(true)}
                  onBlur={() => setFocusPw(false)}
                  placeholder="Mật khẩu"
                  required autoComplete="current-password"
                  disabled={locked}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontSize: 16, color: "#e2e8f0", fontFamily: "inherit",
                    opacity: locked ? 0.4 : 1,
                  }}
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  whileTap={{ scale: 0.88 }}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6 }}
                >
                  {showPw
                    ? <EyeOff size={13} style={{ color: "rgba(148,163,184,0.55)" }} />
                    : <Eye    size={13} style={{ color: "rgba(148,163,184,0.55)" }} />
                  }
                </motion.button>
              </Field>
              {/* Password strength — only when focused and has value */}
              <AnimatePresence>
                {focusPw && password.length > 0 && (
                  <PasswordStrength password={password} />
                )}
              </AnimatePresence>
            </div>

            {/* Remember me row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px" }}>
              <motion.label
                whileTap={{ scale: 0.95 }}
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
                onClick={() => { setRememberMe(v => !v); sfx("softTap"); }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 5,
                  border: `1.5px solid ${rememberMe ? "rgba(14,165,233,0.70)" : "rgba(255,255,255,0.15)"}`,
                  background: rememberMe ? "rgba(14,165,233,0.18)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}>
                  <AnimatePresence>
                    {rememberMe && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 480, damping: 20 }}
                      >
                        <Check size={9} style={{ color: "#38bdf8" }} strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span style={{ fontSize: 10.5, color: "rgba(148,163,184,0.65)", letterSpacing: "0.03em" }}>
                  Ghi nhớ đăng nhập
                </span>
              </motion.label>

              {/* Attempt counter */}
              {attempts > 0 && !locked && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: 9.5, color: `rgba(${attempts >= 4 ? "239,68,68" : "245,158,11"},0.65)`, letterSpacing: "0.04em" }}
                >
                  {attempts}/5 lần thử
                </motion.span>
              )}
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading || success || locked}
              whileTap={loading || success || locked ? {} : { scale: 0.975 }}
              style={{
                position: "relative",
                height: 52, borderRadius: 16, border: "none",
                background: success
                  ? "linear-gradient(135deg, #059669, #10b981)"
                  : locked
                    ? "rgba(255,255,255,0.04)"
                    : "linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)",
                color: locked ? "rgba(255,255,255,0.22)" : "#ffffff",
                fontSize: 11, fontWeight: 800,
                letterSpacing: "0.18em",
                cursor: (loading || success || locked) ? "default" : "pointer",
                fontFamily: "inherit", marginTop: 4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: success
                  ? "0 4px 24px rgba(16,185,129,0.35)"
                  : locked
                    ? "none"
                    : "0 4px 24px rgba(14,165,233,0.28), inset 0 1px 0 rgba(255,255,255,0.20)",
                transition: "background 0.35s, box-shadow 0.35s, color 0.25s",
                overflow: "hidden",
              }}
            >
              {/* Shimmer on button */}
              {!locked && !success && (
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                  style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                    pointerEvents: "none",
                  }}
                />
              )}
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.span key="ok"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Check size={13} strokeWidth={2.5} /> ĐÃ XÁC THỰC
                  </motion.span>
                ) : loading ? (
                  <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: "flex", gap: 5, alignItems: "center" }}
                  >
                    {[0, 1, 2].map(i => (
                      <motion.span key={i}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                        style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", display: "block" }}
                      />
                    ))}
                  </motion.span>
                ) : locked ? (
                  <motion.span key="lock"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Lock size={12} /> KHÓA {lockTimer}S
                  </motion.span>
                ) : (
                  <motion.span key="idle"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    ĐĂNG NHẬP <ArrowRight size={12} strokeWidth={2.5} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {/* Bottom security bar */}
          <div style={{
            marginTop: 20, paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: "rgba(16,185,129,0.10)",
                  border: "1px solid rgba(16,185,129,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ShieldCheck size={10} style={{ color: "#10b981" }} />
              </motion.div>
              <div>
                <p style={{ fontSize: 8.5, color: "rgba(148,163,184,0.55)", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Kết nối TLS 1.3
                </p>
                <p style={{ fontSize: 7.5, color: "rgba(148,163,184,0.28)", letterSpacing: "0.03em" }}>
                  Dữ liệu mã hóa đầu cuối
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[
                { label: "AES-256" },
                { label: "HTTPS" },
              ].map(tag => (
                <span key={tag.label} style={{
                  fontSize: 7.5, color: "rgba(148,163,184,0.35)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6, padding: "2px 6px",
                  letterSpacing: "0.06em", fontWeight: 600,
                }}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ fontSize: 8, color: "rgba(148,163,184,0.18)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
            © {new Date().getFullYear()} POSTLAIN Store Manager
          </p>
          <FooterLinks />
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
