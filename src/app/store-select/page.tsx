"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ArrowRight, Loader2 } from "lucide-react";
import type { StoreConfig } from "@/app/api/stores/route";

// ── Aurora background (tái sử dụng từ login) ─────────────────────────────────
function AuroraBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #040d1a 0%, #060d1e 40%, #050912 100%)",
      }} />
      <motion.div
        animate={{ x: [0, 55, 20, 70, 0], y: [0, 35, 75, 15, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", width: 800, height: 800, borderRadius: "50%",
          top: -280, left: -200,
          background: "radial-gradient(circle at 40% 40%, rgba(14,165,233,0.18) 0%, rgba(56,189,248,0.10) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <motion.div
        animate={{ x: [0, -45, -70, -20, 0], y: [0, -50, -20, -65, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", width: 650, height: 650, borderRadius: "50%",
          bottom: -200, right: -160,
          background: "radial-gradient(circle at 60% 60%, rgba(139,92,246,0.20) 0%, rgba(167,139,250,0.10) 45%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.25, 0.88, 1.10, 1], opacity: [0.5, 0.8, 0.45, 0.70, 0.5] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", width: 350, height: 350, borderRadius: "50%",
          top: "38%", left: "52%", transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(181,242,61,0.14) 0%, rgba(181,242,61,0.07) 55%, transparent 75%)",
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}

// ── Store card ────────────────────────────────────────────────────────────────
function StoreCard({ store, onSelect }: { store: StoreConfig; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", maxWidth: 360,
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${hovered ? "rgba(181,242,61,0.45)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: 20, padding: "24px 28px",
        cursor: "pointer", textAlign: "left",
        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
        boxShadow: hovered
          ? "0 0 0 3px rgba(181,242,61,0.12), 0 8px 40px rgba(0,0,0,0.30)"
          : "0 4px 24px rgba(0,0,0,0.20)",
        display: "flex", alignItems: "center", gap: 18,
      }}
    >
      {/* Logo / icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `linear-gradient(135deg, ${store.color}, ${store.accentColor}22)`,
        border: `1px solid ${store.accentColor}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Building2 size={22} style={{ color: store.accentColor }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 16, fontWeight: 700, letterSpacing: "0.04em",
          color: "#ffffff", marginBottom: 4,
        }}>
          {store.name}
        </div>
        {store.description && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
            {store.description}
          </div>
        )}
      </div>

      {/* Arrow */}
      <motion.div animate={{ x: hovered ? 4 : 0 }} transition={{ duration: 0.15 }}>
        <ArrowRight size={16} style={{ color: hovered ? store.accentColor : "rgba(255,255,255,0.25)" }} />
      </motion.div>
    </motion.button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StoreSelectPage() {
  const router = useRouter();
  const [stores, setStores]   = useState<StoreConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch("/api/stores")
      .then(r => r.json())
      .then((data: StoreConfig[]) => { setStores(data); setLoading(false); })
      .catch(() => { setError("Không tải được danh sách cửa hàng"); setLoading(false); });
  }, []);

  function handleSelect(store: StoreConfig) {
    try { localStorage.setItem("plsm_store_id", store.id); } catch {}
    router.replace(`/login?store=${store.id}`);
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <AuroraBackground />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center" }}
        >
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
            color: "rgba(181,242,61,0.85)", marginBottom: 10,
            textTransform: "uppercase",
          }}>
            Store Manager
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: "0.06em",
            color: "#ffffff", margin: 0, lineHeight: 1.1,
          }}>
            Chọn cửa hàng
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginTop: 8 }}>
            Bạn đang làm việc tại đây?
          </p>
        </motion.div>

        {/* Store list */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.40)", fontSize: 13 }}
              >
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                Đang tải...
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>{error}</div>
          )}

          {!loading && stores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ width: "100%" }}
            >
              <StoreCard store={store} onSelect={() => handleSelect(store)} />
            </motion.div>
          ))}

          {!loading && stores.length === 0 && !error && (
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textAlign: "center" }}>
              Chưa có cửa hàng nào được cấu hình.
            </div>
          )}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", letterSpacing: "0.05em" }}
        >
          POSTLAIN STORE MANAGER
        </motion.div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
