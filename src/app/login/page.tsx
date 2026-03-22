"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, User, AlertCircle, Check } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const router   = useRouter();
  const login    = useStore(s => s.login);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setError("");
    setLoading(true);

    // Small delay for feel
    await new Promise(r => setTimeout(r, 320));

    const ok = await login(email.trim(), password);
    if (ok) {
      setSuccess(true);
      await new Promise(r => setTimeout(r, 420));
      router.replace("/");
    } else {
      setLoading(false);
      setError("Tên đăng nhập hoặc mật khẩu không đúng");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 55%, #fefce8 100%)",
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 380 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <motion.div
            animate={success ? { scale: [1, 1.15, 1], borderColor: ["#C9A55A", "#10b981", "#10b981"] } : {}}
            transition={{ duration: 0.4 }}
            style={{
              width: 56, height: 56, borderRadius: 18,
              border: "1.5px solid #C9A55A",
              background: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 6px 24px rgba(201,165,90,0.18)",
            }}
          >
            {success
              ? <Check size={24} style={{ color: "#10b981" }} strokeWidth={2.5} />
              : <span style={{ fontSize: 24, fontWeight: 800, color: "#C9A55A" }}>P</span>
            }
          </motion.div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#C9A55A", letterSpacing: "0.5em" }}>POSTLAIN</p>
          <p style={{ fontSize: 8.5, color: "#94a3b8", letterSpacing: "0.25em", marginTop: 4 }}>QUẢN LÝ CỬA HÀNG</p>
        </div>

        {/* Card */}
        <div style={{
          background: "#ffffff", borderRadius: 22,
          border: "1px solid #bae6fd",
          boxShadow: "0 12px 40px rgba(12,26,46,0.09)",
          padding: "28px 28px 24px",
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 300, color: "#0c1a2e", marginBottom: 22, letterSpacing: "0.01em" }}>
            Đăng Nhập
          </h2>

          {/* Error message */}
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
                  padding: "9px 12px", borderRadius: 10,
                  background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)",
                }}>
                  <AlertCircle size={12} style={{ color: "#dc2626", flexShrink: 0 }} />
                  <p style={{ fontSize: 10, color: "#dc2626" }}>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {/* Username */}
            <FieldWrap>
              <User size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <input
                type="text" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Tên đăng nhập"
                required autoComplete="username"
                style={inputStyle}
              />
            </FieldWrap>

            {/* Password */}
            <FieldWrap>
              <Lock size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                required autoComplete="current-password"
                style={inputStyle}
              />
              <button
                type="button" onClick={() => setShowPw(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}
              >
                {showPw
                  ? <EyeOff size={13} style={{ color: "#94a3b8" }} />
                  : <Eye size={13} style={{ color: "#94a3b8" }} />
                }
              </button>
            </FieldWrap>

            <motion.button
              type="submit"
              disabled={loading || success}
              animate={success ? { background: "#10b981" } : {}}
              style={{
                height: 46, borderRadius: 13, border: "none",
                background: loading ? "#7dd3fc" : "#0ea5e9",
                color: "#ffffff", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.14em",
                cursor: (loading || success) ? "default" : "pointer",
                fontFamily: "inherit", marginTop: 6,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.25s",
              }}
            >
              {success ? (
                <><Check size={13} strokeWidth={2.5} /> ĐÃ XÁC THỰC</>
              ) : loading ? (
                <LoadingDots />
              ) : (
                "ĐĂNG NHẬP"
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", fontSize: 9, color: "#b0c4d8", marginTop: 20, letterSpacing: "0.1em" }}>
          POSTLAIN STORE MANAGER · PHIÊN BẢN 1.0
        </p>
        <p style={{ textAlign: "center", fontSize: 10, color: "#94a3b8", marginTop: 10 }}>
          Lần đầu sử dụng?{" "}
          <a href="/setup" style={{ color: "#0ea5e9", textDecoration: "underline", cursor: "pointer" }}>
            Cài đặt môi trường →
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex: 1, background: "transparent", border: "none", outline: "none",
  fontSize: 12, color: "#0c1a2e", fontFamily: "inherit",
};

function FieldWrap({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#f0f9ff",
        border: `1px solid ${focused ? "#0ea5e9" : "#bae6fd"}`,
        borderRadius: 13, padding: "0 14px", height: 46,
        transition: "border-color 0.15s",
      }}
    >
      {children}
    </div>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", display: "block" }}
        />
      ))}
    </span>
  );
}
