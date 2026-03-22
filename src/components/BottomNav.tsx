"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Focus, Box, Settings, MessageSquare, UserCircle,
} from "lucide-react";
import { useStore } from "@/store/useStore";

const NAV_ITEMS = [
  { id: "overview",     label: "Tổng Quan", href: "/",             icon: LayoutDashboard, exact: true  },
  { id: "inventory",    label: "Kho Hàng",  href: "/inventory",    icon: Box,             exact: false },
  { id: "chat",         label: "Chat",       href: "/chat",         icon: MessageSquare,   exact: false },
  { id: "settings",     label: "Cài Đặt",   href: "/settings",     icon: Settings,        exact: false },
  { id: "profile",      label: "Hồ Sơ",     href: "/profile",      icon: UserCircle,      exact: false },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const currentUser = useStore(s => s.currentUser);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        background: "#ffffff",
        borderTop: "1px solid #bae6fd",
        display: "flex",
        alignItems: "stretch",
        height: `calc(60px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 16px rgba(12,26,46,0.07)",
      }}
      className="md:hidden"
    >
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href, item.exact);
        const Icon = item.icon;
        const isProfile = item.id === "profile";

        return (
          <Link
            key={item.id}
            href={item.href}
            style={{
              flex: 1, textDecoration: "none",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3, position: "relative", minWidth: 0,
              padding: "0 2px",
            }}
          >
            {/* Active top indicator */}
            {active && (
              <span style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 24, height: 2, borderRadius: "0 0 3px 3px",
                background: "linear-gradient(90deg, #0ea5e9, #38bdf8)",
              }} />
            )}

            {/* Icon */}
            {isProfile && currentUser ? (
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: active
                  ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                  : "linear-gradient(135deg, #0c1a2e, #1e3a5f)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1.5px solid ${active ? "#0ea5e9" : "#bae6fd"}`,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: active ? "#fff" : "#C9A55A" }}>
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            ) : (
              <Icon
                size={18}
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? "#0ea5e9" : "#94a3b8", flexShrink: 0 }}
              />
            )}

            <span style={{
              fontSize: 8,
              fontWeight: active ? 700 : 500,
              letterSpacing: "0.02em",
              color: active ? "#0ea5e9" : "#94a3b8",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
              textAlign: "center",
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
