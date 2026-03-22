"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useStore(s => s.login);
  const [email,   setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 380)); // brief feel of auth
    const ok = login(email.trim(), password);
    setLoading(false);
    if (ok) {
      router.push("/");
    } else {
      setError("Email hoặc mật khẩu không đúng");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 60%, #fef9e7 100%)",
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 380 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, border: "1.5px solid #C9A55A",
            background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px", boxShadow: "0 4px 16px rgba(201,165,90,0.18)",
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#C9A55A" }}>P</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#C9A55A", letterSpacing: "0.5em" }}>POSTLAIN</p>
          <p style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.22em", marginTop: 4 }}>QUẢN LÝ CỬA HÀNG</p>
        </div>

        {/* Card */}
        <div style={{
          background: "#ffffff", borderRadius: 20, border: "1px solid #bae6fd",
          boxShadow: "0 8px 32px rgba(12,26,46,0.08)", padding: "28px 28px 24px",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: "#0c1a2e", marginBottom: 20, letterSpacing: "0.02em" }}>
            Đăng Nhập
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)", marginBottom: 16 }}
            >
              <AlertCircle size={12} style={{ color: "#dc2626", flexShrink: 0 }} />
              <p style={{ fontSize: 10, color: "#dc2626" }}>{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Email */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "0 14px", height: 44, transition: "border-color 0.15s" }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = "#0ea5e9")}
              onBlurCapture={e => (e.currentTarget.style.borderColor = "#bae6fd")}
            >
              <Mail size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0c1a2e", fontFamily: "inherit" }}
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "0 14px", height: 44, transition: "border-color 0.15s" }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = "#0ea5e9")}
              onBlurCapture={e => (e.currentTarget.style.borderColor = "#bae6fd")}
            >
              <Lock size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <input
                type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                required
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0c1a2e", fontFamily: "inherit" }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                {showPw ? <EyeOff size={13} style={{ color: "#94a3b8" }} /> : <Eye size={13} style={{ color: "#94a3b8" }} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44, borderRadius: 12, border: "none",
                background: loading ? "#7dd3fc" : "#0ea5e9",
                color: "#ffffff", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.12em", cursor: loading ? "default" : "pointer",
                fontFamily: "inherit", marginTop: 4, transition: "background 0.2s",
              }}
            >
              {loading ? "ĐANG XÁC THỰC..." : "ĐĂNG NHẬP"}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #e0f2fe" }}>
            <p style={{ fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em" }}>TÀI KHOẢN MẶC ĐỊNH</p>
            <p style={{ fontSize: 9.5, color: "#64748b", marginTop: 4 }}>
              <span style={{ color: "#0ea5e9" }}>admin@postlain.com</span> · mật khẩu: <span style={{ color: "#C9A55A" }}>1234</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
