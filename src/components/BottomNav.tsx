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

function arcPosition(i: number, total: number): { x: number; y: number } {
  const startDeg = -155;
  const endDeg   = -25;
  const span     = endDeg - startDeg;
  const step     = total <= 1 ? 0 : span / (total - 1);
  const deg      = startDeg + step * i;
  const rad      = (deg * Math.PI) / 180;
  const r        = 155;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

export default function BottomNav() {
  const pathname    = usePathname();
  const router      = useRouter();
  const currentUser = useStore(s => s.currentUser);
  const sfx         = useSFX();
  const isAdmin     = currentUser?.role === "admin" || currentUser?.role === "manager";
  const NAV_ITEMS   = NAV_ITEMS_ALL.filter(it => !it.adminOnly || isAdmin);
  const [open, setOpen] = useState(false);
  const orbRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const activeItem = NAV_ITEMS.find(it => isActive(it.href, it.exact)) ?? NAV_ITEMS[0];

  useEffect(() => { setOpen(false); }, [pathname]);

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
    setOpen(false);
    router.push(href);
  }

  const ActiveIcon = activeItem.icon;
  const isProfile  = activeItem.id === "profile";

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.70)",
              zIndex: 49,
            }}
          />
        )}
      </AnimatePresence>

      {/* FAB root */}
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

            return (
              <motion.div
                key={item.id}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                animate={{ x, y, scale: 1, opacity: 1 }}
                exit={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                transition={{
                  type: "spring",
                  damping: 22,
                  stiffness: 340,
                  delay: i * 0.035,
                  opacity: { duration: 0.16 },
                }}
                style={{
                  position: "absolute",
                  bottom: 0, left: "50%",
                  marginLeft: -27,
                  marginBottom: -27,
                  width: 54,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {/* Button — always on dark backdrop, uses lime directly */}
                <motion.button
                  onClick={() => handleNavigate(item.id, item.href)}
                  whileTap={{ scale: 0.88 }}
                  style={{
                    width: 54, height: 54,
                    borderRadius: "50%",
                    border: active ? "1.5px solid #b5f23d" : "1.5px solid rgba(255,255,255,0.12)",
                    background: active ? "#161616" : "#111111",
                    boxShadow: active
                      ? "0 4px 16px rgba(0,0,0,0.70)"
                      : "0 4px 16px rgba(0,0,0,0.60)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0, flexShrink: 0,
                    outline: "none",
                    WebkitTapHighlightColor: "transparent",
                    transition: "border-color 0.14s, box-shadow 0.14s",
                  }}
                >
                  {isProf && currentUser ? (
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: active ? "#b5f23d" : "#1e1e1e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: active ? "1.5px solid rgba(181,242,61,0.70)" : "1.5px solid rgba(255,255,255,0.14)",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: active ? "#050505" : "#b5f23d" }}>
                        {currentUser.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.2 : 1.6}
                      style={{ color: active ? "#b5f23d" : "rgba(255,255,255,0.60)" }}
                    />
                  )}
                </motion.button>

                {/* Label */}
                <div style={{
                  padding: "2px 7px",
                  borderRadius: 8,
                  background: "#0a0a0a",
                  border: active ? "1px solid rgba(181,242,61,0.25)" : "1px solid rgba(255,255,255,0.07)",
                }}>
                  <span style={{
                    fontSize: 8.5,
                    fontWeight: active ? 700 : 600,
                    color: active ? "#b5f23d" : "rgba(255,255,255,0.65)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                    pointerEvents: "none",
                    lineHeight: 1,
                    display: "block",
                  }}>
                    {item.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Main orb — lime solid, flat */}
        <motion.button
          ref={orbRef}
          onClick={() => { sfx(open ? "modalClose" : "tap"); setOpen(v => !v); }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 300 }}
          whileTap={{ scale: 0.94 }}
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
          {/* Orb body — flat lime */}
          <div style={{
            width: "100%", height: "100%",
            borderRadius: "50%",
            background: "#b5f23d",
            boxShadow: open
              ? "0 6px 24px rgba(0,0,0,0.60)"
              : "0 4px 20px rgba(0,0,0,0.50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "box-shadow 0.20s",
          }}>
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
                    <div style={{ position: "absolute", width: 18, height: 2, background: "#050505", borderRadius: 2, transform: "rotate(45deg)", top: 8, left: 0 }} />
                    <div style={{ position: "absolute", width: 18, height: 2, background: "#050505", borderRadius: 2, transform: "rotate(-45deg)", top: 8, left: 0 }} />
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
                      background: "#050505",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#b5f23d" }}>
                        {currentUser.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <ActiveIcon
                      size={22}
                      strokeWidth={2}
                      style={{ color: "#050505" }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active indicator dot — flat, no glow */}
          {!open && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
                width: 6, height: 6, borderRadius: "50%",
                background: "#050505",
                border: "1.5px solid #b5f23d",
              }}
            />
          )}
        </motion.button>
      </div>
    </>
  );
}
