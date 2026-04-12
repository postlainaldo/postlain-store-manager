"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Lock, User, AlertCircle, Check, ArrowRight,
  Shield, WifiOff, Store,
  MessageCircle, FileText, ShieldCheck, X,
} from "lucide-react";
import { useStore, sel } from "@/store/useStore";
import { useSFX, unlockAudio } from "@/hooks/useSFX";

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
              animate={{ opacity: n <= score ? 1 : 0.18 }}
              style={{
                flex: 1, height: 2, borderRadius: 2,
                background: n <= score ? colors[score] : "rgba(255,255,255,0.08)",
                transition: "background 0.25s",
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 9, color: colors[score] || "rgba(255,255,255,0.28)", letterSpacing: "0.06em" }}>
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

// ─── Input field — flat, no glass, no accent line ────────────────────────────

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
      display: "flex", alignItems: "center", gap: 10,
      background: "#1a1a1a",
      border: `1px solid ${
        error   ? "rgba(239,68,68,0.55)"
        : focused ? "#b5f23d"
        : "rgba(255,255,255,0.09)"
      }`,
      borderRadius: 14, padding: "0 16px", height: 52,
      transition: "border-color 0.15s",
    }}>
      <Icon
        size={14}
        style={{
          color: error ? "#ef4444" : focused ? "#b5f23d" : "rgba(255,255,255,0.28)",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
      />
      {children}
    </div>
  );
}

// ─── Footer modal ─────────────────────────────────────────────────────────────

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

function getColorRgb(hex: string): string {
  if (hex === "#38bdf8") return "56,189,248";
  if (hex === "#a78bfa") return "167,139,250";
  return "52,211,153";
}

function FooterLinks() {
  const [open, setOpen] = useState<keyof typeof FOOTER_CONTENT | null>(null);
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
                <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)", margin: "0 10px", display: "block" }} />
              )}
              <button
                onClick={() => setOpen(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                  padding: "4px 6px", borderRadius: 8,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Icon size={9} style={{ color: "rgba(255,255,255,0.22)" }} />
                <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>
                  {item.title}
                </span>
              </button>
            </span>
          );
        })}
      </div>

      <AnimatePresence>
        {active && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(null)}
              style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.65)" }}
            />
            <div
              key="modal-wrapper"
              style={{
                position: "fixed", inset: 0, zIndex: 301,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none", padding: "0 24px",
              }}
            >
              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  pointerEvents: "auto",
                  width: "100%", maxWidth: 380,
                  background: "#161616",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 22,
                  boxShadow: "0 24px 60px rgba(0,0,0,0.70)",
                  overflow: "hidden",
                }}
              >
                {/* Modal header */}
                <div style={{
                  padding: "18px 20px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: `rgba(${getColorRgb(active.color)},0.10)`,
                      border: `1px solid rgba(${getColorRgb(active.color)},0.22)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <active.icon size={14} style={{ color: active.color }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#f5f5f5", letterSpacing: "-0.01em" }}>
                        {active.title}
                      </h3>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em" }}>
                        POSTLAIN Store Manager
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(null)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", outline: "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <X size={12} style={{ color: "rgba(255,255,255,0.45)" }} />
                  </button>
                </div>

                {/* Modal body */}
                <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
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
                              background: `rgba(${getColorRgb(active.color)},0.45)`,
                            }} />
                            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const storeParam = searchParams.get("store");
    if (storeParam) setStoreId(storeParam);
  }, [searchParams, setStoreId]);

  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [focusUser,  setFocusUser]  = useState(false);
  const [focusPw,    setFocusPw]    = useState(false);
  const [attempts,   setAttempts]   = useState(0);
  const [locked,     setLocked]     = useState(false);
  const [lockTimer,  setLockTimer]  = useState(0);

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("plsm_remember");
      if (saved) { setUsername(saved); setRememberMe(true); }
    } catch {}
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success || locked) return;
    if (!online) { sfx("error"); setError("Không có kết nối mạng"); return; }
    setError("");
    setLoading(true);
    sfx("loginSubmit");
    await new Promise(r => setTimeout(r, 240));
    const ok = await login(username.trim(), password);
    if (ok) {
      sfx("loginSuccess");
      setSuccess(true);
      if (rememberMe) {
        try { localStorage.setItem("plsm_remember", username.trim()); } catch {}
      } else {
        try { localStorage.removeItem("plsm_remember"); } catch {}
      }
      await new Promise(r => setTimeout(r, 500));
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
  }, [loading, success, locked, online, login, username, password, rememberMe, attempts, sfx, router]);

  return (
    <div
      onClick={() => unlockAudio()}
      style={{
        minHeight: "100dvh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        position: "relative",
        background: "#0a0a0a",
      }}
    >
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
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.30)",
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
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.5 }}
            style={{ position: "fixed", inset: 0, background: "rgba(181,242,61,0.08)", zIndex: 200, pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}
      >
        {/* ── Logo mark ── */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
            <motion.div
              animate={success ? { scale: [1, 1.18, 1] } : {}}
              transition={{ duration: 0.35 }}
              style={{
                width: 64, height: 64, borderRadius: 22,
                background: "#161616",
                border: "1.5px solid rgba(181,242,61,0.32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.60)",
              }}
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="check"
                    initial={{ scale: 0, rotate: -90, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  >
                    <Check size={24} style={{ color: "#10b981" }} strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.span key="p"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.4, rotate: 90 }}
                    style={{ fontSize: 26, fontWeight: 900, color: "#b5f23d", letterSpacing: "-0.04em" }}
                  >
                    P
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <p style={{
            fontSize: 13, fontWeight: 900, color: "#f5f5f5",
            letterSpacing: "0.40em", lineHeight: 1,
          }}>
            POSTLAIN
          </p>
          <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.30)", letterSpacing: "0.20em", marginTop: 5, textTransform: "uppercase" }}>
            Store Manager
          </p>

          {/* Store badge */}
          {storeName && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(181,242,61,0.06)",
                border: "1px solid rgba(181,242,61,0.22)",
                borderRadius: 9999, padding: "4px 12px 4px 8px",
              }}>
                <Store size={9} style={{ color: "#b5f23d" }} />
                <span style={{ fontSize: 9, color: "#b5f23d", fontWeight: 700, letterSpacing: "0.08em" }}>
                  {storeName}
                </span>
              </div>
            </div>
          )}

          {/* Online indicator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: online ? "#10b981" : "#ef4444",
            }} />
            <span style={{
              fontSize: 9,
              color: online ? "rgba(16,185,129,0.65)" : "rgba(239,68,68,0.65)",
              letterSpacing: "0.08em",
            }}>
              {online ? "Đã kết nối" : "Ngoại tuyến"}
            </span>
          </div>
        </div>

        {/* ── Main card ── */}
        <div style={{
          background: "#161616",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.60)",
          padding: "26px 22px 22px",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 300, color: "#f5f5f5", letterSpacing: "-0.02em", marginBottom: 3 }}>
                Đăng nhập
              </h2>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em" }}>
                Xác thực để tiếp tục
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 20,
              background: "rgba(16,185,129,0.07)",
              border: "1px solid rgba(16,185,129,0.16)",
            }}>
              <Shield size={10} style={{ color: "#10b981" }} />
              <span style={{ fontSize: 8.5, color: "rgba(16,185,129,0.75)", fontWeight: 600, letterSpacing: "0.06em" }}>SSL</span>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 12 }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.20)",
                }}>
                  <AlertCircle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10.5, color: "#ef4444" }}>{error}</p>
                    {locked && (
                      <p style={{ fontSize: 9.5, color: "rgba(239,68,68,0.60)", marginTop: 3 }}>
                        Mở khóa sau {lockTimer}s
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CapsLock */}
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
                  background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.20)",
                }}>
                  <span style={{ fontSize: 10, color: "rgba(245,158,11,0.80)" }}>⚠ Caps Lock đang bật</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  fontSize: 16, color: "#f5f5f5", fontFamily: "inherit",
                  opacity: locked ? 0.4 : 1,
                }}
              />
              {username && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check size={11} style={{ color: "rgba(16,185,129,0.60)" }} />
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
                    fontSize: 16, color: "#f5f5f5", fontFamily: "inherit",
                    opacity: locked ? 0.4 : 1,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6, WebkitTapHighlightColor: "transparent" }}
                >
                  {showPw
                    ? <EyeOff size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
                    : <Eye    size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
                  }
                </button>
              </Field>
              <AnimatePresence>
                {focusPw && password.length > 0 && (
                  <PasswordStrength password={password} />
                )}
              </AnimatePresence>
            </div>

            {/* Remember me */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px" }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
                onClick={() => { setRememberMe(v => !v); sfx("softTap"); }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 5,
                  border: `1.5px solid ${rememberMe ? "#b5f23d" : "rgba(255,255,255,0.14)"}`,
                  background: rememberMe ? "rgba(181,242,61,0.10)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "border-color 0.15s, background 0.15s",
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
                        <Check size={9} style={{ color: "#b5f23d" }} strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", letterSpacing: "0.03em" }}>
                  Ghi nhớ đăng nhập
                </span>
              </label>

              {attempts > 0 && !locked && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: 9.5, color: `rgba(${attempts >= 4 ? "239,68,68" : "245,158,11"},0.60)`, letterSpacing: "0.04em" }}
                >
                  {attempts}/5 lần thử
                </motion.span>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || success || locked}
              whileTap={loading || success || locked ? {} : { scale: 0.98 }}
              style={{
                position: "relative",
                height: 50, borderRadius: 14, border: "none",
                background: success
                  ? "#10b981"
                  : locked
                    ? "rgba(255,255,255,0.05)"
                    : "#b5f23d",
                color: locked ? "rgba(255,255,255,0.22)" : "#050505",
                fontSize: 11, fontWeight: 800,
                letterSpacing: "0.16em",
                cursor: (loading || success || locked) ? "default" : "pointer",
                fontFamily: "inherit", marginTop: 4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.28s, color 0.20s",
              }}
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.span key="ok"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
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
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                        style={{ width: 5, height: 5, borderRadius: "50%", background: "#050505", display: "block" }}
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

          {/* Security bar */}
          <div style={{
            marginTop: 18, paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.16)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ShieldCheck size={10} style={{ color: "#10b981" }} />
              </div>
              <div>
                <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Kết nối TLS 1.3
                </p>
                <p style={{ fontSize: 7.5, color: "rgba(255,255,255,0.18)", letterSpacing: "0.03em" }}>
                  Dữ liệu mã hóa đầu cuối
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {["AES-256", "HTTPS"].map(tag => (
                <span key={tag} style={{
                  fontSize: 7.5, color: "rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6, padding: "2px 6px",
                  letterSpacing: "0.06em", fontWeight: 600,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <p style={{ fontSize: 8, color: "rgba(255,255,255,0.14)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
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
