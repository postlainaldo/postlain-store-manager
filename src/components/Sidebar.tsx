"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Focus,
  Box,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { id: "overview",     label: "Tổng Quan",   href: "/",             icon: LayoutDashboard, exact: true  },
  { id: "visual-board", label: "Bảng Trưng Bày", href: "/visual-board", icon: Focus,        exact: false },
  { id: "inventory",    label: "Kho Hàng",    href: "/inventory",    icon: Box,             exact: false },
  { id: "collections",  label: "Bộ Sưu Tập",  href: "/collections",  icon: Layers,          exact: false },
  { id: "settings",     label: "Cài Đặt",     href: "/settings",     icon: Settings,        exact: false },
] as const;

const EXPANDED_W  = 220;
const COLLAPSED_W = 64;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="relative h-screen flex-shrink-0 flex flex-col overflow-hidden bg-bg-sidebar border-r border-border"
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center flex-shrink-0 border-b border-border overflow-hidden gap-3"
        style={{
          height: 64,
          padding: collapsed ? "0 0 0 16px" : "0 18px",
        }}
      >
        {/* Mark */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-lg border"
          style={{
            width: 32,
            height: 32,
            borderColor: "var(--gold)",
            background: "var(--bg-elevated)",
          }}
        >
          <span
            className="font-extrabold text-gold"
            style={{ fontSize: 13, letterSpacing: "0.04em" }}
          >
            P
          </span>
        </div>

        {/* Wordmark */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="wordmark"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: "hidden", whiteSpace: "nowrap" }}
            >
              <p
                className="text-gold font-bold leading-none"
                style={{ fontSize: 11, letterSpacing: "0.5em" }}
              >
                POSTLAIN
              </p>
              <p
                className="text-text-muted leading-none"
                style={{ fontSize: 7, letterSpacing: "0.28em", marginTop: 5 }}
              >
                QUẢN LÝ CỬA HÀNG
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1"
        style={{ padding: "12px 8px" }}
      >
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact);
          const Icon   = item.icon;

          return (
            <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ backgroundColor: active ? "var(--blue-subtle)" : "var(--bg-elevated)" }}
                style={{
                  position:       "relative",
                  display:        "flex",
                  alignItems:     "center",
                  gap:            10,
                  padding:        collapsed ? "10px 0" : "10px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius:   8,
                  cursor:         "pointer",
                  background:     active ? "var(--blue-subtle)" : "transparent",
                  transition:     "background 0.12s",
                  overflow:       "hidden",
                }}
              >
                {/* Active indicator bar */}
                {active && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    style={{
                      position:     "absolute",
                      left:         0,
                      top:          "20%",
                      height:       "60%",
                      width:        2,
                      background:   "var(--blue)",
                      borderRadius: "0 2px 2px 0",
                    }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}

                <Icon
                  size={16}
                  strokeWidth={active ? 2 : 1.5}
                  style={{
                    flexShrink: 0,
                    color: active ? "var(--blue)" : "var(--text-muted)",
                    transition: "color 0.12s",
                  }}
                />

                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.14 }}
                      style={{
                        fontSize:      11,
                        fontWeight:    active ? 600 : 400,
                        letterSpacing: "0.08em",
                        color:         active ? "var(--text-primary)" : "var(--text-secondary)",
                        whiteSpace:    "nowrap",
                        transition:    "color 0.12s",
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="h-px bg-border flex-shrink-0" />

      {/* ── Theme toggle + Collapse ───────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col gap-2"
        style={{ padding: collapsed ? "12px 0" : "12px 10px" }}
      >
        {/* Theme toggle */}
        <div
          style={{
            display:        "flex",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <ThemeToggle variant={collapsed ? "compact" : "full"} />
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  collapsed ? "center" : "flex-end",
            gap:             6,
            padding:         collapsed ? "8px 0" : "8px 10px",
            background:      "transparent",
            border:          "none",
            cursor:          "pointer",
            width:           "100%",
            borderRadius:    6,
          }}
          className="hover:bg-bg-elevated transition-colors"
        >
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="collapse-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="text-text-muted font-medium"
                style={{ fontSize: 9, letterSpacing: "0.14em", whiteSpace: "nowrap" }}
              >
                THU GỌN
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed ? (
            <ChevronRight size={13} className="text-text-muted" strokeWidth={1.5} />
          ) : (
            <ChevronLeft size={13} className="text-text-muted" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </motion.aside>
  );
}
