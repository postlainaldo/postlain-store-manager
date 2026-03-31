"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/hooks/useSFX";

const SPLASH_KEY = "postlain_splashed_v3";

// Animated particle dot
function Particle({ x, y, delay, size }: { x: string; y: string; delay: number; size: number }) {
  return (
    <motion.div
      style={{
        position: "absolute", left: x, top: y,
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg, #C9A55A, #0ea5e9)",
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0.4, 0.7, 0],
        scale:   [0, 1,   0.7, 1.1, 0],
        y: [0, -20 - Math.random() * 30],
      }}
      transition={{ delay, duration: 2.2 + Math.random(), ease: "easeOut", repeat: Infinity, repeatDelay: 1 + Math.random() * 2 }}
    />
  );
}

// Animated ring layer
function Ring({ size, opacity, strokeWidth, delay, duration }: {
  size: number; opacity: number; strokeWidth: number; delay: number; duration: number;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: size, height: size,
        borderRadius: "50%",
        border: `${strokeWidth}px solid rgba(201,165,90,${opacity})`,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: [0.6, 1.4, 1.6], opacity: [0, opacity, 0] }}
      transition={{ delay, duration, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const alreadySplashed = sessionStorage.getItem(SPLASH_KEY);
    if (alreadySplashed) return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);

    // Boot sound — fired after a tiny delay so AudioContext can resume on user gesture context
    const tBoot = setTimeout(() => playSound("boot"), 100);

    // Phase timeline
    const t1 = setTimeout(() => setPhase("hold"), 800);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    const t3 = setTimeout(() => setVisible(false), 2900);
    return () => { clearTimeout(tBoot); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const particles = [
    { x: "15%", y: "20%", delay: 0.8, size: 4 },
    { x: "80%", y: "18%", delay: 1.1, size: 3 },
    { x: "10%", y: "70%", delay: 0.5, size: 5 },
    { x: "85%", y: "72%", delay: 1.4, size: 3 },
    { x: "25%", y: "85%", delay: 0.9, size: 4 },
    { x: "70%", y: "82%", delay: 0.6, size: 3 },
    { x: "5%",  y: "45%", delay: 1.2, size: 2 },
    { x: "92%", y: "42%", delay: 0.7, size: 2 },
    { x: "45%", y: "8%",  delay: 1.0, size: 3 },
    { x: "55%", y: "90%", delay: 1.3, size: 4 },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden", userSelect: "none",
            background: "#060f1e",
          }}
        >
          {/* Deep gradient bg */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 30% 40%, rgba(14,165,233,0.12) 0%, transparent 55%), radial-gradient(ellipse at 75% 60%, rgba(201,165,90,0.1) 0%, transparent 50%)",
          }} />

          {/* Animated noise texture */}
          <motion.div
            style={{
              position: "absolute", inset: 0,
              background: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
              opacity: 0.4,
            }}
          />

          {/* Grid overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

          {/* Floating particles */}
          {particles.map((p, i) => <Particle key={i} {...p} />)}

          {/* Pulse rings around logo */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <Ring size={180} opacity={0.12} strokeWidth={1} delay={0.6} duration={2.5} />
            <Ring size={240} opacity={0.08} strokeWidth={1} delay={1.0} duration={2.5} />
            <Ring size={300} opacity={0.05} strokeWidth={1} delay={1.4} duration={2.5} />
          </div>

          {/* Main logo container */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.4, 0.64, 1] }}
            style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {/* Outer glow ring */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                width: 130, height: 130,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 0%, #C9A55A 25%, transparent 50%, #0ea5e9 75%, transparent 100%)",
                filter: "blur(2px)",
                opacity: 0.5,
              }}
            />
            {/* Static ring */}
            <div style={{
              position: "absolute",
              width: 120, height: 120,
              borderRadius: "50%",
              border: "1.5px solid rgba(201,165,90,0.3)",
              boxShadow: "0 0 30px rgba(201,165,90,0.15), inset 0 0 30px rgba(14,165,233,0.08)",
            }} />

            {/* Logo disc */}
            <div style={{
              width: 110, height: 110,
              borderRadius: "50%",
              background: "linear-gradient(145deg, #0d1f38 0%, #0a1525 50%, #061020 100%)",
              border: "2px solid rgba(201,165,90,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 8px rgba(14,165,233,0.06), 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(201,165,90,0.18)",
              position: "relative", zIndex: 1,
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}
              >
                {/* Gold bar above */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  style={{ width: 24, height: 1.5, background: "linear-gradient(90deg, transparent, #C9A55A, transparent)", marginBottom: 4 }}
                />
                <span style={{
                  fontSize: 26, fontWeight: 800, color: "#C9A55A",
                  letterSpacing: "0.1em",
                  fontFamily: "var(--font-montserrat), sans-serif",
                  textShadow: "0 0 20px rgba(201,165,90,0.5)",
                }}>
                  ADL
                </span>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.55, duration: 0.3 }}
                  style={{ width: 24, height: 1.5, background: "linear-gradient(90deg, transparent, #0ea5e9, transparent)", marginTop: 4 }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* App name */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
            style={{ position: "relative", zIndex: 2, marginTop: 36, textAlign: "center" }}
          >
            <motion.p
              style={{
                fontSize: 26, fontWeight: 800, color: "#ffffff",
                letterSpacing: "0.28em",
                fontFamily: "var(--font-montserrat), sans-serif",
                textShadow: "0 2px 20px rgba(255,255,255,0.12)",
              }}
            >
              POSTLAIN
            </motion.p>

            {/* Animated underline */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.75, duration: 0.5, ease: "easeOut" }}
              style={{
                height: 1, marginTop: 6,
                background: "linear-gradient(90deg, transparent 0%, #C9A55A 30%, #0ea5e9 70%, transparent 100%)",
                borderRadius: 2,
              }}
            />

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              style={{
                marginTop: 8, fontSize: 10, color: "rgba(201,165,90,0.65)",
                letterSpacing: "0.35em",
                fontFamily: "var(--font-montserrat), sans-serif",
              }}
            >
              STORE MANAGER
            </motion.p>
          </motion.div>

          {/* Bottom section: location + progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            style={{
              position: "absolute", bottom: "9%",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              width: "100%", zIndex: 2,
            }}
          >
            {/* Location tag */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0, duration: 0.35 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 20,
                border: "1px solid rgba(14,165,233,0.25)",
                background: "rgba(14,165,233,0.06)",
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0ea5e9",
                boxShadow: "0 0 6px rgba(14,165,233,0.8)", animation: "pulse-dot 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 9, color: "rgba(14,165,233,0.8)", letterSpacing: "0.18em", fontWeight: 600 }}>
                ĐÀ LẠT
              </span>
            </motion.div>

            {/* Progress bar */}
            <div style={{
              width: 160, height: 2, borderRadius: 2,
              background: "rgba(255,255,255,0.07)", overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.05, duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #0ea5e9 0%, #C9A55A 100%)",
                  borderRadius: 2,
                  boxShadow: "0 0 8px rgba(14,165,233,0.6)",
                }}
              />
            </div>
          </motion.div>

          {/* Corner decorations */}
          {[
            { top: "6%",  left: "6%",  rx: "0 0 8px 0",   borderRight: "1px solid rgba(201,165,90,0.3)", borderBottom: "1px solid rgba(201,165,90,0.3)" },
            { top: "6%",  right: "6%", rx: "0 0 0 8px",   borderLeft:  "1px solid rgba(201,165,90,0.3)", borderBottom: "1px solid rgba(201,165,90,0.3)" },
            { bottom: "6%", left: "6%",  rx: "0 8px 0 0",  borderRight: "1px solid rgba(14,165,233,0.25)", borderTop: "1px solid rgba(14,165,233,0.25)" },
            { bottom: "6%", right: "6%", rx: "8px 0 0 0",  borderLeft:  "1px solid rgba(14,165,233,0.25)", borderTop: "1px solid rgba(14,165,233,0.25)" },
          ].map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}
              style={{
                position: "absolute",
                width: 20, height: 20,
                borderRadius: s.rx,
                ...s,
                top: s.top, bottom: s.bottom,
                left: s.left, right: s.right,
                borderRight: s.borderRight,
                borderBottom: s.borderBottom,
                borderLeft: s.borderLeft,
                borderTop: s.borderTop,
              }}
            />
          ))}

          <style>{`
            @keyframes pulse-dot {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
