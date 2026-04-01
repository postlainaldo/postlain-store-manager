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
  "sales":        "loginSuccess",
  "report":       "loginSubmit",
  "chat":         "notify",
  "schedule":     "modalOpen",
  "profile":      "save",
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

const NAV_ITEMS = [
  { id: "overview",     label: "Tổng Quan", href: "/",             icon: LayoutDashboard, exact: true  },
  { id: "visual-board", label: "Vị Trí",    href: "/visual-board", icon: Focus,           exact: false },
  { id: "inventory",    label: "Dữ Liệu",   href: "/inventory",    icon: Box,             exact: false },
  { id: "sales",        label: "Bán Hàng",  href: "/sales",        icon: ShoppingBag,     exact: false },
  { id: "report",       label: "Báo Cáo",   href: "/report",       icon: ClipboardList,   exact: false },
  { id: "chat",         label: "Chat",      href: "/chat",         icon: MessageSquare,   exact: false },
  { id: "schedule",     label: "Lịch Làm",  href: "/schedule",     icon: CalendarDays,    exact: false },
  { id: "profile",      label: "Hồ Sơ",     href: "/profile",      icon: UserCircle,      exact: false },
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
  const [open, setOpen]           = useState(false);
  const [flashId, setFlashId]     = useState<string | null>(null);
  const orbRef = useRef<HTMLButtonElement>(null);

  // Disable looping animations on Android (GPU performance)
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const infiniteRepeat = isAndroid ? 0 : Infinity;

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
              background: "rgba(2,6,23,0.60)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
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
                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(201,165,90,0.08) 40%, rgba(14,165,233,0.06) 60%, rgba(255,255,255,0.03) 100%)",
                    backgroundSize: "300% 100%",
                    border: `1px solid ${active ? "rgba(201,165,90,0.22)" : "rgba(255,255,255,0.06)"}`,
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    pointerEvents: "none",
                    zIndex: 0,
                    boxShadow: isFlash
                      ? `0 0 0 8px rgba(201,165,90,0.25), 0 0 24px rgba(201,165,90,0.40)`
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
                    border: `1.5px solid ${active ? "rgba(201,165,90,0.70)" : isFlash ? "rgba(201,165,90,0.70)" : "rgba(255,255,255,0.16)"}`,
                    background: active
                      ? "linear-gradient(135deg, #132238 0%, #1e3a5f 100%)"
                      : isFlash
                        ? "linear-gradient(135deg, #1e3a5f 0%, #0c1a2e 100%)"
                        : "rgba(10,15,30,0.88)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    boxShadow: active
                      ? "0 0 0 3px rgba(201,165,90,0.22), 0 8px 24px rgba(0,0,0,0.50)"
                      : isFlash
                        ? "0 0 0 4px rgba(201,165,90,0.30), 0 0 20px rgba(201,165,90,0.50)"
                        : "0 4px 18px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
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
                        ? "linear-gradient(135deg, #C9A55A, #E2C07A)"
                        : "linear-gradient(135deg, #1e3a5f, #2d4a7a)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1.5px solid ${active || isFlash ? "rgba(201,165,90,0.65)" : "rgba(255,255,255,0.18)"}`,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: active || isFlash ? "#0c1a2e" : "#C9A55A" }}>
                        {currentUser.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <Icon
                      size={20}
                      strokeWidth={active || isFlash ? 2.2 : 1.6}
                      style={{
                        color: active || isFlash ? "#C9A55A" : "rgba(255,255,255,0.75)",
                        filter: active || isFlash ? "drop-shadow(0 0 8px rgba(201,165,90,0.75))" : "none",
                        transition: "color 0.15s, filter 0.15s",
                      }}
                    />
                  )}
                </motion.button>

                {/* Label pill — sits below button, clears the circle */}
                <div style={{
                  position: "relative", zIndex: 1,
                  padding: "2px 7px",
                  borderRadius: 10,
                  background: "rgba(5,10,22,0.75)",
                  border: `1px solid ${active ? "rgba(201,165,90,0.30)" : "rgba(255,255,255,0.08)"}`,
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}>
                  <span style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: active ? "#C9A55A" : "rgba(255,255,255,0.80)",
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
            y: open ? 0 : [0, -4, 1, -2, 0],
            scale: open ? 1 : [1, 1.03, 0.99, 1.02, 1],
          }}
          transition={{
            rotate: { type: "spring", damping: 18, stiffness: 280 },
            y: open ? { duration: 0.2 } : { duration: 4.0, repeat: infiniteRepeat, ease: "easeInOut" },
            scale: open ? { duration: 0.2 } : { duration: 4.0, repeat: infiniteRepeat, ease: "easeInOut" },
          }}
          style={{
            position: "relative",
            width: 68, height: 68,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            padding: 0,
            zIndex: 2,
            outline: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* Continuous shimmer ring on orb */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: infiniteRepeat, ease: "linear" }}
            style={{
              position: "absolute", inset: -3,
              borderRadius: "50%",
              background: "conic-gradient(from 0deg, transparent 0%, rgba(201,165,90,0.35) 25%, transparent 50%, rgba(14,165,233,0.25) 75%, transparent 100%)",
              filter: "blur(1px)",
              opacity: open ? 0.9 : 0.55,
              transition: "opacity 0.3s",
              pointerEvents: "none",
            }}
          />
          {/* Pulse ring */}
          <motion.div
            animate={{ scale: open ? [1, 1.22, 1] : 1, opacity: open ? [0.5, 0, 0.5] : 0.4 }}
            transition={{ duration: 1.6, repeat: open ? Infinity : 0, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -7,
              borderRadius: "50%",
              border: "1.5px solid rgba(201,165,90,0.35)",
              pointerEvents: "none",
            }}
          />

          {/* Orb body */}
          <div style={{
            width: "100%", height: "100%",
            borderRadius: "50%",
            background: open
              ? "linear-gradient(135deg, #1a2e4a 0%, #0c1a2e 100%)"
              : "linear-gradient(135deg, #0c1a2e 0%, #152540 50%, #0c1a2e 100%)",
            border: "1.5px solid rgba(201,165,90,0.55)",
            boxShadow: open
              ? "0 0 0 3px rgba(201,165,90,0.18), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(201,165,90,0.22)"
              : "0 0 0 2px rgba(201,165,90,0.12), 0 6px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(201,165,90,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.25s, box-shadow 0.25s",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Shimmer sweep on orb body */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.2, repeat: infiniteRepeat, ease: "easeInOut", repeatDelay: 1.5 }}
              style={{
                position: "absolute",
                top: 0, bottom: 0, left: 0,
                width: "40%",
                background: "linear-gradient(90deg, transparent, rgba(201,165,90,0.18), transparent)",
                pointerEvents: "none",
                borderRadius: "50%",
              }}
            />

            {/* Active page icon or close X */}
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div
                  key="close"
                  initial={{ scale: 0.6, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <div style={{ position: "relative", width: 16, height: 16 }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 16, height: 1.5, background: "rgba(201,165,90,0.9)", borderRadius: 2, transform: "rotate(45deg)", position: "absolute" }} />
                      <div style={{ width: 16, height: 1.5, background: "rgba(201,165,90,0.9)", borderRadius: 2, transform: "rotate(-45deg)", position: "absolute" }} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="active-icon"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                >
                  {isProfile && currentUser ? (
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "linear-gradient(135deg, #C9A55A, #E2C07A)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#0c1a2e" }}>
                        {currentUser.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <ActiveIcon
                      size={20}
                      strokeWidth={2}
                      style={{ color: "#C9A55A", filter: "drop-shadow(0 0 6px rgba(201,165,90,0.55))" }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active indicator dot */}
          {!open && (
            <div style={{
              position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)",
              width: 5, height: 5, borderRadius: "50%",
              background: "linear-gradient(135deg, #C9A55A, #E2C07A)",
              boxShadow: "0 0 6px rgba(201,165,90,0.70)",
              border: "1px solid rgba(12,26,46,0.8)",
            }} />
          )}
        </motion.button>
      </div>
    </>
  );
}
