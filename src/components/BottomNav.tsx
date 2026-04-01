"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Focus, Box, MessageSquare, UserCircle,
  ShoppingBag, ClipboardList, CalendarDays,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useSFX } from "@/hooks/useSFX";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { id: "overview",     label: "Tổng Quan", href: "/",             icon: LayoutDashboard, exact: true  },
  { id: "visual-board", label: "Vị Trí",    href: "/visual-board", icon: Focus,           exact: false },
  { id: "inventory",    label: "Dữ Liệu",   href: "/inventory",    icon: Box,             exact: false },
  { id: "sales",        label: "Bán Hàng",  href: "/sales",        icon: ShoppingBag,     exact: false },
  { id: "report",       label: "Báo Cáo",   href: "/report",       icon: ClipboardList,   exact: false },
  { id: "chat",         label: "Chat",       href: "/chat",         icon: MessageSquare,   exact: false },
  { id: "schedule",     label: "Lịch Làm",  href: "/schedule",     icon: CalendarDays,    exact: false },
  { id: "profile",      label: "Hồ Sơ",     href: "/profile",      icon: UserCircle,      exact: false },
] as const;

// Arc geometry: spread 7 items (skip active) across a 180° upper arc
// Returns (x, y) offset in px from orb center for index i of N total items
function arcPosition(i: number, total: number): { x: number; y: number } {
  // Arc from 200° to 340° (left-upper to upper-right), open fan
  const startDeg = 200;
  const endDeg   = 340;
  const span     = endDeg - startDeg;
  const step     = total <= 1 ? 0 : span / (total - 1);
  const deg      = startDeg + step * i;
  const rad      = (deg * Math.PI) / 180;
  const r        = 82; // radius in px
  return {
    x: Math.cos(rad) * r,
    y: Math.sin(rad) * r,
  };
}

export default function BottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const currentUser = useStore(s => s.currentUser);
  const sfx       = useSFX();
  const [open, setOpen] = useState(false);
  const orbRef    = useRef<HTMLButtonElement>(null);

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

  // Items to show in arc: all except active
  const arcItems = NAV_ITEMS.filter(it => it.id !== activeItem.id);

  function handleNavigate(href: string) {
    sfx("navigate");
    setOpen(false);
    router.push(href);
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
              background: "rgba(2,6,23,0.55)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
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
          bottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
          right: 20,
          zIndex: 50,
        }}
      >
        {/* Arc nav items */}
        <AnimatePresence>
          {open && arcItems.map((item, i) => {
            const { x, y } = arcPosition(i, arcItems.length);
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            const isProf = item.id === "profile";

            return (
              <motion.button
                key={item.id}
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                animate={{ x, y, scale: 1, opacity: 1 }}
                exit={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                transition={{
                  type: "spring",
                  damping: 20,
                  stiffness: 320,
                  delay: open ? i * 0.04 : (arcItems.length - 1 - i) * 0.025,
                }}
                onClick={() => handleNavigate(item.href)}
                style={{
                  position: "absolute",
                  bottom: 0, right: 0,
                  width: 46, height: 46,
                  borderRadius: "50%",
                  border: `1.5px solid ${active ? "rgba(201,165,90,0.65)" : "rgba(255,255,255,0.12)"}`,
                  background: active
                    ? "linear-gradient(135deg, #0c1a2e 0%, #1a2e4a 100%)"
                    : "rgba(15,23,42,0.90)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: active
                    ? "0 0 0 2px rgba(201,165,90,0.28), 0 6px 20px rgba(0,0,0,0.40)"
                    : "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  padding: 0,
                  transform: "translate(0,0)", // framer-motion handles actual transform
                }}
              >
                {isProf && currentUser ? (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: active
                      ? "linear-gradient(135deg, #C9A55A, #E2C07A)"
                      : "linear-gradient(135deg, #1e3a5f, #2d4a7a)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1.5px solid ${active ? "rgba(201,165,90,0.6)" : "rgba(255,255,255,0.15)"}`,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: active ? "#0c1a2e" : "#C9A55A" }}>
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <Icon
                    size={17}
                    strokeWidth={active ? 2.2 : 1.6}
                    style={{
                      color: active ? "#C9A55A" : "rgba(255,255,255,0.70)",
                      filter: active ? "drop-shadow(0 0 5px rgba(201,165,90,0.50))" : "none",
                    }}
                  />
                )}
                {/* Label tooltip above icon */}
                <span style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: active ? "#C9A55A" : "#94a3b8",
                  whiteSpace: "nowrap",
                  background: "rgba(2,6,23,0.85)",
                  padding: "2px 7px",
                  borderRadius: 6,
                  border: `1px solid ${active ? "rgba(201,165,90,0.22)" : "rgba(255,255,255,0.08)"}`,
                  pointerEvents: "none",
                  letterSpacing: "0.04em",
                }}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Main orb */}
        <motion.button
          ref={orbRef}
          onClick={() => { sfx(open ? "modalClose" : "tap"); setOpen(v => !v); }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 280 }}
          style={{
            position: "relative",
            width: 58, height: 58,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            padding: 0,
            zIndex: 2,
            outline: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* Outer glow ring */}
          <motion.div
            animate={{ scale: open ? [1, 1.18, 1] : 1, opacity: open ? [0.6, 0, 0.6] : 0.5 }}
            transition={{ duration: 1.8, repeat: open ? Infinity : 0, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -6,
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
            border: "1.5px solid rgba(201,165,90,0.50)",
            boxShadow: open
              ? "0 0 0 3px rgba(201,165,90,0.18), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(201,165,90,0.20)"
              : "0 0 0 2px rgba(201,165,90,0.12), 0 6px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(201,165,90,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.25s, box-shadow 0.25s",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Gold shimmer sweep */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(130deg, transparent 30%, rgba(201,165,90,0.12) 50%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }} />

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
                  {/* X mark from two lines */}
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

          {/* Active indicator dot — bottom of orb */}
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
