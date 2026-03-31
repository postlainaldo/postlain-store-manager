"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, User, AlertCircle, Check, ArrowRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useSFX, unlockAudio } from "@/hooks/useSFX";

// ─── Animated orb background ──────────────────────────────────────────────────

function AuroraBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Base gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #e0f2fe 0%, #ede9fe 50%, #fce7f3 100%)",
      }} />
      {/* Orb 1 — blue-cyan, top-left */}
      <div style={{
        position: "absolute",
        width: 700, height: 700,
        borderRadius: "50%",
        top: -200, left: -160,
        background: "radial-gradient(circle at 40% 40%, rgba(186,230,253,0.85) 0%, rgba(165,180,252,0.50) 50%, transparent 70%)",
        filter: "blur(80px)",
        animation: "orbA 20s ease-in-out infinite alternate",
      }} />
      {/* Orb 2 — violet-pink, bottom-right */}
      <div style={{
        position: "absolute",
        width: 600, height: 600,
        borderRadius: "50%",
        bottom: -180, right: -120,
        background: "radial-gradient(circle at 60% 60%, rgba(216,180,254,0.75) 0%, rgba(251,207,232,0.50) 50%, transparent 70%)",
        filter: "blur(80px)",
        animation: "orbB 26s ease-in-out infinite alternate",
      }} />
      {/* Orb 3 — mint, mid */}
      <div style={{
        position: "absolute",
        width: 400, height: 400,
        borderRadius: "50%",
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldWrap({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: focused ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.70)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      border: `1px solid ${focused ? "rgba(14,165,233,0.55)" : "rgba(186,230,253,0.70)"}`,
      borderRadius: 14, padding: "0 16px", height: 52,
      transition: "border-color 0.18s, background 0.18s",
      boxShadow: focused ? "0 0 0 3px rgba(14,165,233,0.12)" : "none",
    }}>
      {children}
    </div>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <motion.span key={i}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", display: "block" }}
        />
      ))}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router  = useRouter();
  const login   = useStore(s => s.login);
  const sfx     = useSFX();

  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [focusUser, setFocusUser] = useState(false);
  const [focusPw,   setFocusPw]   = useState(false);

  // Unlock AudioContext on first interaction on the login page
  const handleFirstInteraction = () => unlockAudio();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setError("");
    setLoading(true);
    sfx("loginSubmit");
    await new Promise(r => setTimeout(r, 300));
    const ok = await login(username.trim(), password);
    if (ok) {
      sfx("loginSuccess");
      setSuccess(true);
      await new Promise(r => setTimeout(r, 500));
      router.replace("/");
    } else {
      sfx("error");
      setLoading(false);
      setError("Tên đăng nhập hoặc mật khẩu không đúng");
    }
  };

  return (
    <div onClick={handleFirstInteraction} style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}
      >

        {/* ── Logo ── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <motion.div
            animate={success ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.45 }}
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: "rgba(255,255,255,0.90)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              border: "1.5px solid rgba(14,165,233,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(14,165,233,0.14), inset 0 1px 0 rgba(255,255,255,0.95)",
            }}
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                  <Check size={26} style={{ color: "#10b981" }} strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.span key="p" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                  style={{ fontSize: 26, fontWeight: 800, color: "#0284c7", letterSpacing: "-0.02em" }}>
                  P
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#0284c7", letterSpacing: "0.48em" }}>POSTLAIN</p>
          <p style={{ fontSize: 8, color: "rgba(12,26,46,0.38)", letterSpacing: "0.22em", marginTop: 5, textTransform: "uppercase" }}>
            Quản Lý Cửa Hàng
          </p>
        </div>

        {/* ── Glass card ── */}
        <div style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(28px) saturate(1.8)",
          WebkitBackdropFilter: "blur(28px) saturate(1.8)",
          borderRadius: 24,
          border: "1px solid rgba(186,230,253,0.65)",
          boxShadow: "0 16px 56px rgba(12,26,46,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
          padding: "32px 28px 28px",
        }}>

          <h2 style={{ fontSize: 22, fontWeight: 300, color: "#0c1a2e", marginBottom: 6, letterSpacing: "-0.01em" }}>
            Đăng nhập
          </h2>
          <p style={{ fontSize: 11, color: "rgba(12,26,46,0.42)", marginBottom: 24 }}>
            Chào mừng trở lại
          </p>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 16 }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)",
                }}>
                  <AlertCircle size={13} style={{ color: "#dc2626", flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#dc2626" }}>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Username */}
            <FieldWrap focused={focusUser}>
              <User size={14} style={{ color: focusUser ? "#0ea5e9" : "#94a3b8", flexShrink: 0, transition: "color 0.18s" }} />
              <input
                type="text" value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocusUser(true)}
                onBlur={() => setFocusUser(false)}
                placeholder="Tên đăng nhập"
                required autoComplete="username"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 13, color: "#0c1a2e", fontFamily: "inherit",
                }}
              />
            </FieldWrap>

            {/* Password */}
            <FieldWrap focused={focusPw}>
              <Lock size={14} style={{ color: focusPw ? "#0ea5e9" : "#94a3b8", flexShrink: 0, transition: "color 0.18s" }} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusPw(true)}
                onBlur={() => setFocusPw(false)}
                placeholder="Mật khẩu"
                required autoComplete="current-password"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 13, color: "#0c1a2e", fontFamily: "inherit",
                }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6 }}>
                {showPw
                  ? <EyeOff size={14} style={{ color: "#94a3b8" }} />
                  : <Eye size={14} style={{ color: "#94a3b8" }} />
                }
              </button>
            </FieldWrap>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || success}
              whileTap={loading || success ? {} : { scale: 0.98 }}
              style={{
                height: 52, borderRadius: 14, border: "none",
                background: success
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                color: "#ffffff", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.14em",
                cursor: (loading || success) ? "default" : "pointer",
                fontFamily: "inherit", marginTop: 4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: success
                  ? "0 4px 20px rgba(16,185,129,0.35)"
                  : "0 4px 20px rgba(14,165,233,0.35)",
                transition: "background 0.3s, box-shadow 0.3s",
              }}
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.span key="ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={14} strokeWidth={2.5} /> ĐÃ XÁC THỰC
                  </motion.span>
                ) : loading ? (
                  <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <LoadingDots />
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    ĐĂNG NHẬP <ArrowRight size={13} strokeWidth={2} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 9, color: "rgba(12,26,46,0.28)", marginTop: 24, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          POSTLAIN Store Manager · v1.0
        </p>
      </motion.div>
    </div>
  );
}
