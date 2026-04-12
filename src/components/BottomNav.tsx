"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Focus, Box, MessageSquare, UserCircle,
  ShoppingBag, ClipboardList, CalendarDays,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useSFX, type SFXName } from "@/hooks/useSFX";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Random idle animation variants — each icon gets a unique float pattern
const IDLE_FLOATS = [
  { y: [0, -5, 2, -3, 0], x: [0, 2, -1, 1, 0], rotate: [0, 2, -1, 0.5, 0], dur: 3.8 },
  { y: [0, -3, 4, -2, 0], x: [0, -2, 1, -1, 0], rotate: [0, -1.5, 2, -0.5, 0], dur: 4.2 },
  { y: [0, -6, 1, -4, 0], x: [0, 1, -2, 0.5, 0], rotate: [0, 1, -2, 1, 0], dur: 3.5 },
  { y: [0, -2, 5, -1, 0], x: [0, -1, 2, -2, 0], rotate: [0, -2, 1, -1, 0], dur: 4.5 },
  { y: [0, -4, 2, -5, 0], x: [0, 2, -1, 2, 0], rotate: [0, 0.5, -2, 1.5, 0], dur: 3.2 },
  { y: [0, -3, 3, -2, 0], x: [0, -1, 3, -1, 0], rotate: [0, 1.5, -1, 2, 0], dur: 4.8 },
  { y: [0, -5, 1, -3, 0], x: [0, 1, -3, 1, 0], rotate: [0, -1, 2, -1.5, 0], dur: 3.6 },
  { y: [0, -2, 4, -3, 0], x: [0, -2, 1, 2, 0], rotate: [0, 2, -0.5, -1, 0], dur: 4.1 },
];

// Per-nav-item distinct sound assignments
const NAV_SOUNDS: Record<string, SFXName> = {
  "overview":     "navigate",
  "visual-board": "scan",
  "inventory":    "softTap",
  "sales":        "purchase",
  "report":       "loginSubmit",
  "chat":         "notify",
  "schedule":     "unlock",
  "profile":      "success",
};

// Pre-navigate flash variants (random per item for variety)
const FLASH_VARIANTS = [
  { scale: [1, 1.35, 0.9], brightness: [1, 2.5, 1] },
  { scale: [1, 1.28, 1.1], brightness: [1, 2.0, 1] },
  { scale: [1, 1.40, 0.85], brightness: [1, 3.0, 1] },
  { scale: [1, 1.22, 1.15], brightness: [1, 1.8, 1] },
  { scale: [1, 1.32, 0.95], brightness: [1, 2.2, 1] },
  { scale: [1, 1.38, 0.88], brightness: [1, 2.8, 1] },
  { scale: [1, 1.25, 1.12], brightness: [1, 2.1, 1] },
  { scale: [1, 1.30, 0.92], brightness: [1, 2.4, 1] },
];

const NAV_ITEMS_ALL = [
  { id: "overview",     label: "Tổng Quan", href: "/",             icon: LayoutDashboard, exact: true,  adminOnly: false },
  { id: "visual-board", label: "Vị Trí",    href: "/visual-board", icon: Focus,           exact: false, adminOnly: false },
  { id: "inventory",    label: "Dữ Liệu",   href: "/inventory",    icon: Box,             exact: false, adminOnly: false },
  { id: "sales",        label: "Bán Hàng",  href: "/sales",        icon: ShoppingBag,     exact: false, adminOnly: false },
  { id: "report",       label: "Báo Cáo",   href: "/report",       icon: ClipboardList,   exact: false, adminOnly: false },
  { id: "chat",         label: "Chat",      href: "/chat",         icon: MessageSquare,   exact: false, adminOnly: false },
  { id: "schedule",     label: "Lịch Làm",  href: "/schedule",     icon: CalendarDays,    exact: false, adminOnly: false },
  { id: "profile",      label: "Hồ Sơ",     href: "/profile",      icon: UserCircle,      exact: false, adminOnly: false },
] as const;

// Arc geometry — wider radius so labels clear each other
function arcPosition(i: number, total: number): { x: number; y: number } {
  const startDeg = -155;
  const endDeg   = -25;
  const span     = endDeg - startDeg;
  const step     = total <= 1 ? 0 : span / (total - 1);
  const deg      = startDeg + step * i;
  const rad      = (deg * Math.PI) / 180;
  const r        = 155; // px — generous radius keeps labels apart
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

export default function BottomNav() {
  const pathname    = usePathname();
  const router      = useRouter();
  const currentUser = useStore(s => s.currentUser);
  const sfx         = useSFX();
  const isAdmin     = currentUser?.role === "admin" || currentUser?.role === "manager";
  const NAV_ITEMS   = NAV_ITEMS_ALL.filter(it => !it.adminOnly || isAdmin);
  const [open, setOpen]           = useState(false);
  const [flashId, setFlashId]     = useState<string | null>(null);
  const orbRef = useRef<HTMLButtonElement>(null);

  // Disable looping animations on mobile — use state to avoid SSR mismatch
  const [isMobile, setIsMobile] = useState(true); // default true = safe (no animations until confirmed desktop)
  useEffect(() => {
    setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || window.innerWidth < 768);
  }, []);
  const isAndroid = isMobile;
  const infiniteRepeat = isMobile ? 0 : Infinity;

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const activeItem = NAV_ITEMS.find(it => isActive(it.href, it.exact)) ?? NAV_ITEMS[0];

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (orbRef.current && !orbRef.current.closest("[data-fab-root]")?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const arcItems = NAV_ITEMS.filter(it => it.id !== activeItem.id);

  function handleNavigate(itemId: string, href: string) {
    sfx(NAV_SOUNDS[itemId] ?? "navigate");
    setFlashId(itemId);
    // Short flash then navigate
    setTimeout(() => {
      setOpen(false);
      setFlashId(null);
      router.push(href);
    }, 260);
  }

  const ActiveIcon = activeItem.icon;
  const isProfile  = activeItem.id === "profile";

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: isMobile ? "none" : "blur(8px)",
              WebkitBackdropFilter: isMobile ? "none" : "blur(8px)",
              zIndex: 49,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── FAB root ── */}
      <div
        data-fab-root
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
        }}
      >
        {/* Arc nav items */}
        <AnimatePresence>
          {open && arcItems.map((item, i) => {
            const { x, y } = arcPosition(i, arcItems.length);
            const Icon     = item.icon;
            const active   = isActive(item.href, item.exact);
            const isProf   = item.id === "profile";
            const isFlash  = flashId === item.id;
            const flashV   = FLASH_VARIANTS[i % FLASH_VARIANTS.length];

            const float = IDLE_FLOATS[i % IDLE_FLOATS.length];

            return (
              // Outer: spring to arc position + flash scale
              <motion.div
                key={item.id}
                initial={{ x: 0, y: 0, scale: 0.25, opacity: 0 }}
                animate={{
                  x, y,
                  scale: isFlash ? flashV.scale : 1,
                  opacity: 1,
                }}
                exit={{ x: 0, y: 0, scale: 0.25, opacity: 0 }}
                transition={{
                  type: "spring",
                  damping: 22,
                  stiffness: 340,
                  delay: i * 0.04,
                  scale: isFlash
                    ? { duration: 0.25, ease: "easeOut", times: [0, 0.5, 1] }
                    : { type: "spring", damping: 22, stiffness: 340 },
                  opacity: { duration: 0.18 },
                }}
                style={{
                  position: "absolute",
                  bottom: 0, left: "50%",
                  marginLeft: -27,
                  marginBottom: -27,
                  width: 54,
                }}
              >
                {/* Inner: continuous idle float when open and not flashing */}
                <motion.div
                  animate={isFlash ? { x: 0, y: 0, rotate: 0 } : {
                    x: float.x,
                    y: float.y,
                    rotate: float.rotate,
                  }}
                  transition={isFlash ? { duration: 0.1 } : {
                    x: { duration: float.dur, repeat: infiniteRepeat, ease: "easeInOut", repeatType: "loop" },
                    y: { duration: float.dur, repeat: infiniteRepeat, ease: "easeInOut", repeatType: "loop" },
                    rotate: { duration: float.dur * 1.15, repeat: infiniteRepeat, ease: "easeInOut", repeatType: "loop" },
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    width: 54,
                  }}
                >
                {/* Glass pill background — continuous shimmer sweep */}
                <motion.div
                  animate={{
                    backgroundPosition: ["200% center", "-200% center"],
                  }}
                  transition={{ duration: 2.8, repeat: infiniteRepeat, ease: "linear" }}
                  style={{
                    position: "absolute",
                    top: -4, left: "50%", transform: "translateX(-50%)",
                    width: 62, height: 62,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(181,242,61,0.07) 40%, rgba(139,196,42,0.05) 60%, rgba(255,255,255,0.02) 100%)",
                    backgroundSize: "300% 100%",
                    border: `1px solid ${active ? "rgba(181,242,61,0.25)" : "rgba(255,255,255,0.06)"}`,
                    backdropFilter: isMobile ? "none" : "blur(12px)",
                    WebkitBackdropFilter: isMobile ? "none" : "blur(12px)",
                    pointerEvents: "none",
                    zIndex: 0,
                    boxShadow: isFlash
                      ? `0 0 0 8px rgba(181,242,61,0.22), 0 0 24px rgba(181,242,61,0.40)`
                      : "none",
                  }}
                />

                <motion.button
                  onClick={() => handleNavigate(item.id, item.href)}
                  whileTap={{ scale: 0.80 }}
                  transition={{ type: "spring", damping: 14, stiffness: 420 }}
                  style={{
                    position: "relative", zIndex: 1,
                    width: 54, height: 54,
                    borderRadius: "50%",
                    border: `1.5px solid ${active ? "rgba(181,242,61,0.70)" : isFlash ? "rgba(181,242,61,0.70)" : "rgba(255,255,255,0.10)"}`,
                    background: active
                      ? "linear-gradient(135deg, #1a1a1a 0%, #111111 100%)"
                      : isFlash
                        ? "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)"
                        : "rgba(10,10,10,0.92)",
                    backdropFilter: isMobile ? "none" : "blur(20px)",
                    WebkitBackdropFilter: isMobile ? "none" : "blur(20px)",
                    boxShadow: active
                      ? "0 0 0 3px rgba(181,242,61,0.20), 0 8px 24px rgba(0,0,0,0.70)"
                      : isFlash
                        ? "0 0 0 4px rgba(181,242,61,0.28), 0 0 20px rgba(181,242,61,0.45)"
                        : "0 4px 18px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0, flexShrink: 0,
                    transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                  }}
                >
                  {isProf && currentUser ? (
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: active || isFlash
                        ? "#b5f23d"
                        : "linear-gradient(135deg, #1a1a1a, #111111)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1.5px solid ${active || isFlash ? "rgba(181,242,61,0.80)" : "rgba(255,255,255,0.14)"}`,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: active || isFlash ? "#050505" : "#b5f23d" }}>
                        {currentUser.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <Icon
                      size={20}
                      strokeWidth={active || isFlash ? 2.2 : 1.6}
                      style={{
                        color: active || isFlash ? "#b5f23d" : "rgba(255,255,255,0.65)",
                        transition: "color 0.15s",
                      }}
                    />
                  )}
                </motion.button>

                {/* Label pill — sits below button, clears the circle */}
                <div style={{
                  position: "relative", zIndex: 1,
                  padding: "2px 7px",
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.85)",
                  border: `1px solid ${active ? "rgba(181,242,61,0.30)" : "rgba(255,255,255,0.07)"}`,
                  backdropFilter: isMobile ? "none" : "blur(8px)",
                  WebkitBackdropFilter: isMobile ? "none" : "blur(8px)",
                }}>
                  <span style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: active ? "#b5f23d" : "rgba(255,255,255,0.75)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                    textShadow: "0 1px 3px rgba(0,0,0,0.95)",
                    pointerEvents: "none",
                    lineHeight: 1,
                    display: "block",
                  }}>
                    {item.label}
                  </span>
                </div>
                </motion.div>{/* /inner float */}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Main orb */}
        <motion.button
          ref={orbRef}
          onClick={() => { sfx(open ? "modalClose" : "tap"); setOpen(v => !v); }}
          animate={{
            rotate: open ? 45 : 0,
            y: open ? 0 : [0, -5, 1.5, -3, 0],
            scale: open ? 1 : [1, 1.04, 0.98, 1.02, 1],
          }}
          transition={{
            rotate: { type: "spring", damping: 16, stiffness: 300 },
            y: open ? { duration: 0.2 } : { duration: 4.2, repeat: infiniteRepeat, ease: "easeInOut" },
            scale: open ? { duration: 0.2 } : { duration: 4.2, repeat: infiniteRepeat, ease: "easeInOut" },
          }}
          style={{
            position: "relative",
            width: 72, height: 72,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            padding: 0,
            zIndex: 2,
            outline: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* Outer ambient glow layer */}
          <div style={{
            position: "absolute", inset: -8,
            borderRadius: "50%",
            background: open
              ? "radial-gradient(circle, rgba(181,242,61,0.28) 0%, rgba(139,196,42,0.12) 60%, transparent 75%)"
              : "radial-gradient(circle, rgba(181,242,61,0.18) 0%, rgba(139,196,42,0.06) 60%, transparent 75%)",
            transition: "background 0.35s",
            pointerEvents: "none",
          }} />

          {/* Continuous shimmer ring on orb — desktop only */}
          {!isMobile && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: -4,
                borderRadius: "50%",
                background: open
                  ? "conic-gradient(from 0deg, transparent 0%, rgba(181,242,61,0.65) 20%, rgba(139,196,42,0.40) 40%, transparent 55%, rgba(181,242,61,0.50) 75%, transparent 100%)"
                  : "conic-gradient(from 0deg, transparent 0%, rgba(181,242,61,0.45) 25%, transparent 50%, rgba(139,196,42,0.28) 75%, transparent 100%)",
                filter: "blur(1.5px)",
                opacity: open ? 1 : 0.65,
                transition: "opacity 0.3s, background 0.3s",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Double pulse rings */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0, 0.45] }}
            transition={{ duration: 2.0, repeat: open ? Infinity : 0, ease: "easeOut", delay: 0 }}
            style={{
              position: "absolute", inset: -9,
              borderRadius: "50%",
              border: "1.5px solid rgba(181,242,61,0.40)",
              pointerEvents: "none",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.55, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.0, repeat: open ? Infinity : 0, ease: "easeOut", delay: 0.4 }}
            style={{
              position: "absolute", inset: -9,
              borderRadius: "50%",
              border: "1px solid rgba(181,242,61,0.22)",
              pointerEvents: "none",
            }}
          />

          {/* Orb body */}
          <div style={{
            width: "100%", height: "100%",
            borderRadius: "50%",
            background: open
              ? "linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 50%, #050505 100%)"
              : "linear-gradient(145deg, #151515 0%, #0a0a0a 45%, #050505 100%)",
            border: "1.5px solid rgba(181,242,61,0.70)",
            boxShadow: open
              ? "0 0 0 3px rgba(181,242,61,0.20), 0 0 30px rgba(181,242,61,0.35), 0 10px 40px rgba(0,0,0,0.85), inset 0 1px 0 rgba(181,242,61,0.20)"
              : "0 0 0 2px rgba(181,242,61,0.12), 0 0 18px rgba(181,242,61,0.25), 0 8px 28px rgba(0,0,0,0.80), inset 0 1px 0 rgba(181,242,61,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.28s, box-shadow 0.28s",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Shimmer sweep on orb body — desktop only */}
            {!isMobile && (
              <motion.div
                animate={{ x: ["-120%", "220%"] }}
                transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.0 }}
                style={{
                  position: "absolute",
                  top: "-10%", bottom: "-10%", left: 0,
                  width: "45%",
                  background: "linear-gradient(90deg, transparent, rgba(181,242,61,0.18), rgba(255,255,255,0.06), transparent)",
                  pointerEvents: "none",
                  transform: "skewX(-15deg)",
                }}
              />
            )}

            {/* Active page icon or close X */}
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div
                  key="close"
                  initial={{ scale: 0.5, opacity: 0, rotate: -60 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 60 }}
                  transition={{ type: "spring", damping: 18, stiffness: 360 }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <div style={{ position: "relative", width: 18, height: 18 }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 18, height: 2, background: "rgba(181,242,61,0.95)", borderRadius: 2, transform: "rotate(45deg)", position: "absolute", boxShadow: "0 0 6px rgba(181,242,61,0.6)" }} />
                      <div style={{ width: 18, height: 2, background: "rgba(181,242,61,0.95)", borderRadius: 2, transform: "rotate(-45deg)", position: "absolute", boxShadow: "0 0 6px rgba(181,242,61,0.6)" }} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="active-icon"
                  initial={{ scale: 0.65, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.65, opacity: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 380 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                >
                  {isProfile && currentUser ? (
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: "linear-gradient(135deg, #b5f23d, #8bc42a)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 10px rgba(181,242,61,0.55)",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)" }}>
                        {currentUser.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <ActiveIcon
                      size={22}
                      strokeWidth={2}
                      style={{ color: "#b5f23d", filter: "drop-shadow(0 0 8px rgba(181,242,61,0.70))" }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active indicator dot */}
          {!open && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
                width: 6, height: 6, borderRadius: "50%",
                background: "linear-gradient(135deg, #b5f23d, #8bc42a)",
                boxShadow: "0 0 8px rgba(181,242,61,0.80)",
                border: "1.5px solid rgba(0,0,0,0.9)",
              }}
            />
          )}
        </motion.button>
      </div>
    </>
  );
}
