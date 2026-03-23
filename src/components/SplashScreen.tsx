"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_KEY = "postlain_splashed";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per session, and only in PWA/standalone mode or on mobile
    const alreadySplashed = sessionStorage.getItem(SPLASH_KEY);
    if (alreadySplashed) return;

    // Mark as shown for this session
    sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);

    // Auto-dismiss after 2.6s
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#0c1a2e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            userSelect: "none",
          }}
        >
          {/* Radial glow behind logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.25, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, #C9A55A 0%, #0ea5e9 50%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Logo ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 100%)",
              border: "2.5px solid rgba(201,165,90,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 6px rgba(14,165,233,0.12), 0 0 40px rgba(201,165,90,0.25)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* ADL text */}
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#C9A55A",
                letterSpacing: "0.06em",
                fontFamily: "var(--font-montserrat), sans-serif",
              }}
            >
              ADL
            </motion.span>
          </motion.div>

          {/* App name */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.45, ease: "easeOut" }}
            style={{
              marginTop: 28,
              fontSize: 22,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "0.22em",
              fontFamily: "var(--font-montserrat), sans-serif",
              position: "relative",
              zIndex: 1,
            }}
          >
            POSTLAIN
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.4, ease: "easeOut" }}
            style={{
              marginTop: 6,
              fontSize: 10,
              color: "rgba(201,165,90,0.75)",
              letterSpacing: "0.28em",
              fontFamily: "var(--font-montserrat), sans-serif",
              position: "relative",
              zIndex: 1,
            }}
          >
            STORE MANAGER
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{
              position: "absolute",
              bottom: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 140,
              height: 2,
              borderRadius: 4,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
              zIndex: 1,
            }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 1.0, duration: 1.4, ease: "easeInOut" }}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #0ea5e9, #C9A55A)",
                borderRadius: 4,
              }}
            />
          </motion.div>

          {/* Corner dots decoration */}
          {[
            { top: "8%", left: "8%"  },
            { top: "8%", right: "8%" },
            { bottom: "18%", left: "8%"  },
            { bottom: "18%", right: "8%" },
          ].map((pos, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
              style={{
                position: "absolute",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#C9A55A",
                ...pos,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
