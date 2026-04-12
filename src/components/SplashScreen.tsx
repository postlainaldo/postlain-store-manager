"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound, playSplashMusic } from "@/hooks/useSFX";

const SPLASH_KEY = "postlain_splashed_v6";

// ─── Main ────────────────────────────────────────────────────────────────────

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const alreadySplashed = sessionStorage.getItem(SPLASH_KEY);
    if (alreadySplashed) return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);

    let stopMusic: (() => void) | null = null;
    const t1 = setTimeout(() => setPhase("hold"), 900);
    const t2 = setTimeout(() => {
      setPhase("out");
      stopMusic?.();
    }, 3000);
    const t3 = setTimeout(() => setVisible(false), 3550);

    const onGesture = () => {
      stopMusic = playSplashMusic();
      playSound("boot");
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      stopMusic?.();
    };
  }, []);

  void phase; // phase retained for future use

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.42, ease: [0.4, 0, 1, 1] }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden", userSelect: "none",
            background: "#0a0a0a",
          }}
        >
          {/* ── Logo assembly ── */}
          <motion.div
            initial={{ scale: 0.80, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.4, 0.64, 1] }}
            style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {/* Logo disc — flat circle, lime border */}
            <div style={{
              width: 96, height: 96,
              borderRadius: "50%",
              background: "#161616",
              border: "1.5px solid rgba(181,242,61,0.40)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.70)",
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.30, duration: 0.40, ease: [0.34, 1.3, 0.64, 1] }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}
              >
                {/* Top rule */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.42, duration: 0.28, ease: "easeOut" }}
                  style={{ width: 24, height: 1, background: "#b5f23d", marginBottom: 5, borderRadius: 1 }}
                />
                <span style={{
                  fontSize: 20, fontWeight: 900, color: "#b5f23d",
                  letterSpacing: "0.06em",
                  fontFamily: "var(--font-montserrat), sans-serif",
                  lineHeight: 1,
                }}>ADL</span>
                {/* Bottom rule */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.48, duration: 0.28, ease: "easeOut" }}
                  style={{ width: 24, height: 1, background: "#8bc42a", marginTop: 5, borderRadius: 1 }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* ── App name ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48, duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", zIndex: 2, marginTop: 32, textAlign: "center" }}
          >
            <p style={{
              fontSize: 30, fontWeight: 900, letterSpacing: "0.30em",
              fontFamily: "var(--font-montserrat), sans-serif",
              color: "#f5f5f5",
              lineHeight: 1,
            }}>
              POSTLAIN
            </p>

            {/* Underline — flat lime bar */}
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.70, duration: 0.40, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: 2, marginTop: 8, background: "#b5f23d", borderRadius: 1 }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.80, duration: 0.32 }}
              style={{
                marginTop: 10, fontSize: 9, letterSpacing: "0.36em",
                fontFamily: "var(--font-montserrat), sans-serif",
                color: "rgba(181,242,61,0.80)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              ALDO! GO · ĐÀ LẠT
            </motion.p>
          </motion.div>

          {/* ── Bottom: badge + loading bar ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.90 }}
            style={{
              position: "absolute", bottom: "8%",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              width: "100%", zIndex: 2,
            }}
          >
            {/* Location badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 16px", borderRadius: 9999,
              border: "1px solid rgba(181,242,61,0.28)",
              background: "rgba(181,242,61,0.06)",
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#b5f23d",
              }} />
              <span style={{
                fontSize: 9, color: "rgba(181,242,61,0.85)",
                letterSpacing: "0.20em", fontWeight: 700,
                fontFamily: "var(--font-montserrat), sans-serif",
              }}>
                ĐÀ LẠT · ALDO GO!
              </span>
            </div>

            {/* Loading bar — flat */}
            <div style={{ position: "relative", width: 180, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.0, duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  height: "100%", borderRadius: 2,
                  background: "#b5f23d",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
