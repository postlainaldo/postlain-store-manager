"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound, playSplashMusic } from "@/hooks/useSFX";

const SPLASH_KEY = "postlain_splashed_v4";

// Detect mobile/low-power devices to reduce animation cost
function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FloatOrb({ x, y, size, color, delay, blur, mobile }: {
  x: string; y: string; size: number; color: string; delay: number; blur: number; mobile: boolean;
}) {
  // On mobile: no filter blur (GPU killer), simpler opacity animation
  return (
    <motion.div
      style={{
        position: "absolute", left: x, top: y,
        width: mobile ? size * 0.75 : size,
        height: mobile ? size * 0.75 : size,
        borderRadius: "50%", pointerEvents: "none",
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
        filter: mobile ? "none" : `blur(${blur}px)`,
      }}
      initial={{ opacity: 0 }}
      animate={mobile ? {
        opacity: [0, 0.35, 0.15, 0.30, 0],
      } : {
        opacity: [0, 0.55, 0.30, 0.50, 0.20, 0.45, 0],
        scale:   [0.6, 1.1, 0.9, 1.2, 0.95, 1.05, 0.7],
        x: [0, 14, -8, 18, -5, 10, 0],
        y: [0, -18, 10, -25, 8, -12, 0],
      }}
      transition={{ delay, duration: mobile ? 4 : 6 + delay * 1.5, ease: "easeInOut", repeat: mobile ? 0 : Infinity, repeatType: "mirror" }}
    />
  );
}

function ScanLine() {
  return (
    <motion.div
      style={{
        position: "absolute", left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent 0%, rgba(14,165,233,0.0) 10%, rgba(14,165,233,0.45) 50%, rgba(14,165,233,0.0) 90%, transparent 100%)",
        boxShadow: "0 0 12px rgba(14,165,233,0.5)",
        pointerEvents: "none",
      }}
      initial={{ top: "10%", opacity: 0 }}
      animate={{ top: ["10%", "90%", "10%"], opacity: [0, 0.8, 0.8, 0] }}
      transition={{ delay: 0.8, duration: 3.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
    />
  );
}

function DataStream({ x, delay }: { x: string; delay: number }) {
  const chars = "01POSTLAIN■▲◆░▒▓";
  const stream = Array.from({ length: 12 }, (_, i) => chars[Math.floor((i * 7 + delay * 3) % chars.length)]);
  return (
    <motion.div
      style={{
        position: "absolute", left: x, top: 0,
        display: "flex", flexDirection: "column", gap: 2,
        fontFamily: "monospace", fontSize: 8,
        color: "rgba(14,165,233,0.18)",
        letterSpacing: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
      initial={{ y: "-100%", opacity: 0 }}
      animate={{ y: "110%", opacity: [0, 0.6, 0.6, 0] }}
      transition={{ delay, duration: 3.5 + delay, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
    >
      {stream.map((c, i) => <span key={i}>{c}</span>)}
    </motion.div>
  );
}

function HexGrid() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: `
        linear-gradient(rgba(14,165,233,0.028) 1px, transparent 1px),
        linear-gradient(90deg, rgba(14,165,233,0.028) 1px, transparent 1px)
      `,
      backgroundSize: "36px 36px",
      maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
    }} />
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [exiting, setExiting] = useState(false);
  const [mobile] = useState(() => isMobile());

  useEffect(() => {
    const alreadySplashed = sessionStorage.getItem(SPLASH_KEY);
    if (alreadySplashed) return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);

    let stopMusic: (() => void) | null = null;
    const t1 = setTimeout(() => setPhase("hold"), 900);
    const t2 = setTimeout(() => {
      setPhase("out");
      setExiting(true);
      stopMusic?.();
    }, 3200);
    const t3 = setTimeout(() => setVisible(false), 3900);

    // Play audio only after first user gesture — browser policy
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

  const orbs = [
    { x: "8%",  y: "12%", size: 260, color: "#0ea5e9", delay: 0,   blur: 55 },
    { x: "65%", y: "8%",  size: 200, color: "#C9A55A", delay: 0.4, blur: 50 },
    { x: "72%", y: "60%", size: 280, color: "#6366f1", delay: 0.7, blur: 60 },
    { x: "-5%", y: "55%", size: 220, color: "#0ea5e9", delay: 1.1, blur: 52 },
    { x: "40%", y: "78%", size: 180, color: "#C9A55A", delay: 0.3, blur: 45 },
    { x: "50%", y: "30%", size: 150, color: "#10b981", delay: 0.9, blur: 48 },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={mobile ? {
            opacity: 0,
            scale: 1.06,
            y: -20,
          } : {
            opacity: 0,
            scale: 1.18,
            filter: "blur(22px) brightness(2.5)",
            y: -40,
          }}
          transition={{ duration: mobile ? 0.45 : 0.65, ease: [0.55, 0, 1, 0.45] }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden", userSelect: "none",
            background: "#03070f",
          }}
        >
          {/* Exit burst — white flash overlay */}
          {exiting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              transition={{ duration: 0.55, ease: "easeOut", times: [0, 0.25, 1] }}
              style={{
                position: "absolute", inset: 0, zIndex: 100,
                background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(201,165,90,0.5) 40%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
          )}
          {/* ── Deep space gradient base ── */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 120% 80% at 50% 50%, #070f24 0%, #03070f 65%)",
          }} />

          {/* ── Floating orbs — fewer on mobile ── */}
          {(mobile ? orbs.slice(0, 3) : orbs).map((o, i) => (
            <FloatOrb key={i} {...o} mobile={mobile} />
          ))}

          {/* ── Grid overlay — skip on mobile ── */}
          {!mobile && <HexGrid />}

          {/* ── Scan line — skip on mobile ── */}
          {!mobile && <ScanLine />}

          {/* ── Data streams — skip on mobile ── */}
          {!mobile && <DataStream x="7%"  delay={0.5} />}
          {!mobile && <DataStream x="88%" delay={1.2} />}
          {!mobile && <DataStream x="22%" delay={2.0} />}

          {/* ── Corner brackets ── */}
          {[
            { style: { top: 24, left: 24,   borderTop: "2px solid rgba(201,165,90,0.55)", borderLeft:  "2px solid rgba(201,165,90,0.55)", borderRadius: "6px 0 0 0"   } },
            { style: { top: 24, right: 24,  borderTop: "2px solid rgba(201,165,90,0.55)", borderRight: "2px solid rgba(201,165,90,0.55)", borderRadius: "0 6px 0 0"   } },
            { style: { bottom: 24, left: 24,  borderBottom: "2px solid rgba(14,165,233,0.45)", borderLeft:  "2px solid rgba(14,165,233,0.45)", borderRadius: "0 0 0 6px"   } },
            { style: { bottom: 24, right: 24, borderBottom: "2px solid rgba(14,165,233,0.45)", borderRight: "2px solid rgba(14,165,233,0.45)", borderRadius: "0 0 6px 0"   } },
          ].map((c, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
              style={{ position: "absolute", width: 28, height: 28, ...c.style }}
            />
          ))}

          {/* ── Central logo assembly ── */}
          <motion.div
            initial={{ scale: 0.25, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {/* Three concentric rings — fewer on mobile */}
            {(mobile ? [{ r: 82, opacity: 0.18, sw: 1, delay: 0.3, dur: 2.5 }] : [
              { r: 160, opacity: 0.05, sw: 1, delay: 0.9, dur: 3.2 },
              { r: 118, opacity: 0.10, sw: 1, delay: 0.6, dur: 2.8 },
              { r: 82,  opacity: 0.18, sw: 1, delay: 0.3, dur: 2.5 },
            ]).map((ring, ri) => (
              <motion.div key={ri}
                style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: ring.r, height: ring.r,
                  borderRadius: "50%",
                  border: `${ring.sw}px solid rgba(201,165,90,${ring.opacity})`,
                  transform: "translate(-50%, -50%)",
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.5, 1.8], opacity: [0, ring.opacity * 1.4, 0] }}
                transition={{ delay: ring.delay, duration: ring.dur, repeat: Infinity, ease: "easeOut" }}
              />
            ))}

            {/* Spinning conic arc — no blur on mobile */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", width: 152, height: 152,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 0%, rgba(201,165,90,0.55) 18%, transparent 35%, rgba(14,165,233,0.40) 65%, transparent 80%)",
                filter: mobile ? "none" : "blur(1.5px)",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* Reverse spin arc — desktop only */}
            {!mobile && (
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", width: 136, height: 136,
                borderRadius: "50%",
                background: "conic-gradient(from 90deg, transparent 0%, rgba(99,102,241,0.30) 20%, transparent 40%)",
                filter: "blur(1px)",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
            )}

            {/* Static ring */}
            <div style={{
              position: "absolute", width: 124, height: 124,
              borderRadius: "50%",
              border: "1px solid rgba(201,165,90,0.22)",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 30px rgba(201,165,90,0.12), inset 0 0 30px rgba(14,165,233,0.06)",
            }} />

            {/* Logo disc */}
            <div style={{
              width: 114, height: 114,
              borderRadius: "50%",
              background: "linear-gradient(145deg, #0d1f38 0%, #080f20 55%, #040a16 100%)",
              border: "2px solid rgba(201,165,90,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 10px rgba(14,165,233,0.04), 0 24px 72px rgba(0,0,0,0.75), 0 0 50px rgba(201,165,90,0.14)",
              position: "relative", zIndex: 1,
              overflow: "hidden",
            }}>
              {/* Inner shimmer */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                style={{
                  position: "absolute", top: 0, bottom: 0, left: 0,
                  width: "45%",
                  background: "linear-gradient(90deg, transparent, rgba(201,165,90,0.15), transparent)",
                  pointerEvents: "none",
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.55, ease: [0.34, 1.3, 0.64, 1] }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative", zIndex: 1 }}
              >
                <motion.div
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={{ delay: 0.55, duration: 0.35 }}
                  style={{ width: 28, height: 1.5, background: "linear-gradient(90deg, transparent, #C9A55A, transparent)", marginBottom: 5 }}
                />
                <span style={{
                  fontSize: 28, fontWeight: 900, color: "#C9A55A",
                  letterSpacing: "0.12em",
                  fontFamily: "var(--font-montserrat), sans-serif",
                  textShadow: "0 0 24px rgba(201,165,90,0.7), 0 0 8px rgba(201,165,90,0.4)",
                  lineHeight: 1,
                }}>ADL</span>
                <motion.div
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.35 }}
                  style={{ width: 28, height: 1.5, background: "linear-gradient(90deg, transparent, #0ea5e9, transparent)", marginTop: 5 }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* ── App name block ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", zIndex: 3, marginTop: 40, textAlign: "center" }}
          >
            {/* POSTLAIN with letter-reveal */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <motion.p style={{
                fontSize: 32, fontWeight: 900, letterSpacing: "0.30em",
                fontFamily: "var(--font-montserrat), sans-serif",
                lineHeight: 1,
                background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #C9A55A 70%, #ffffff 100%)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
                animate={{ backgroundPosition: ["0% center", "200% center", "0% center"] }}
                transition={{ delay: 1.2, duration: 3, ease: "linear", repeat: Infinity }}
              >
                POSTLAIN
              </motion.p>

              {/* Shimmer underline */}
              <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.85, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: 1.5, marginTop: 7,
                  background: "linear-gradient(90deg, transparent 0%, #C9A55A 30%, #0ea5e9 60%, #6366f1 80%, transparent 100%)",
                  borderRadius: 2,
                  boxShadow: "0 0 8px rgba(14,165,233,0.4)",
                }}
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95, duration: 0.4 }}
              style={{
                marginTop: 10, fontSize: 11, letterSpacing: "0.42em",
                fontFamily: "var(--font-montserrat), sans-serif",
                color: "rgba(148,163,184,0.75)",
                textTransform: "uppercase",
              }}
            >
              STORE MANAGER
            </motion.p>
          </motion.div>

          {/* ── Version / system tag ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            style={{ position: "relative", zIndex: 3, marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}
          >
            <div style={{ width: 18, height: 1, background: "rgba(201,165,90,0.30)" }} />
            <span style={{ fontSize: 8, color: "rgba(201,165,90,0.50)", letterSpacing: "0.22em", fontFamily: "monospace" }}>
              SYSTEM READY
            </span>
            <div style={{ width: 18, height: 1, background: "rgba(201,165,90,0.30)" }} />
          </motion.div>

          {/* ── Bottom: location + loading bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15 }}
            style={{
              position: "absolute", bottom: "8%",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              width: "100%", zIndex: 3,
            }}
          >
            {/* Location badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.15, duration: 0.35 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "5px 14px", borderRadius: 20,
                border: "1px solid rgba(14,165,233,0.28)",
                background: "rgba(14,165,233,0.07)",
                backdropFilter: "blur(8px)",
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: "#0ea5e9", boxShadow: "0 0 7px rgba(14,165,233,0.9)" }}
              />
              <span style={{ fontSize: 9, color: "rgba(14,165,233,0.85)", letterSpacing: "0.20em", fontWeight: 700, fontFamily: "var(--font-montserrat), sans-serif" }}>
                ĐÀ LẠT • ALDO GO!
              </span>
            </motion.div>

            {/* Multi-segment loading bar */}
            <div style={{ position: "relative", width: 200, height: 3 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: 3,
                background: "rgba(255,255,255,0.05)",
              }} />
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  height: "100%", borderRadius: 3,
                  background: "linear-gradient(90deg, #6366f1 0%, #0ea5e9 35%, #10b981 65%, #C9A55A 100%)",
                  boxShadow: "0 0 10px rgba(14,165,233,0.7)",
                  position: "relative",
                }}
              >
                {/* Glow dot at tip */}
                <motion.div
                  style={{
                    position: "absolute", right: -1, top: "50%",
                    transform: "translateY(-50%)",
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#C9A55A",
                    boxShadow: "0 0 8px rgba(201,165,90,0.9)",
                  }}
                />
              </motion.div>
            </div>

            {/* Loading label */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.4, 0.6] }}
              transition={{ delay: 1.3, duration: 1.5, repeat: Infinity }}
              style={{ fontSize: 7.5, color: "rgba(148,163,184,0.45)", letterSpacing: "0.18em", fontFamily: "monospace" }}
            >
              INITIALIZING...
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
