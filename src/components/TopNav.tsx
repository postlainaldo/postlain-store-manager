"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Focus, Box, Settings, LogIn, LogOut,
  MessageSquare, User,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import NotificationBanner from "@/components/NotificationBanner";

const NAV_ITEMS = [
  { id: "overview",     label: "Tổng Quan",  href: "/",             icon: LayoutDashboard, exact: true  },
  { id: "visual-board", label: "Trưng Bày",  href: "/visual-board", icon: Focus,           exact: false },
  { id: "inventory",    label: "Kho Hàng",   href: "/inventory",    icon: Box,             exact: false },
  { id: "chat",         label: "Chat",        href: "/chat",         icon: MessageSquare,   exact: false },
  { id: "settings",     label: "Cài Đặt",    href: "/settings",     icon: Settings,        exact: false },
] as const;

export default function TopNav() {
  const pathname = usePathname();
  const storeName = useStore(s => s.storeName);
  const currentUser = useStore(s => s.currentUser);
  const logout = useStore(s => s.logout);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const storeSubtitle = storeName.includes("—")
    ? storeName.split("—")[1]?.trim()
    : storeName;

  return (
    <header
      className="hidden md:flex flex-shrink-0 items-center gap-0"
      style={{
        height: 52,
        background: "#ffffff",
        borderBottom: "1px solid #bae6fd",
        padding: "0 20px",
        boxShadow: "0 1px 4px rgba(12,26,46,0.06)",
        zIndex: 40,
      }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <Link
        href="/"
        style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginRight: 24 }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          border: "1.5px solid #C9A55A",
          background: "linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#C9A55A", letterSpacing: "0.06em" }}>P</span>
        </div>
        <div style={{ lineHeight: 1 }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, color: "#C9A55A", letterSpacing: "0.48em" }}>POSTLAIN</p>
          <p style={{ fontSize: 7, color: "#94a3b8", letterSpacing: "0.2em", marginTop: 3 }}>
            {storeSubtitle || "QUẢN LÝ CỬA HÀNG"}
          </p>
        </div>
      </Link>

      {/* ── Nav links ────────────────────────────────────── */}
      <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 8,
                background: active ? "rgba(14,165,233,0.08)" : "transparent",
                border: `1px solid ${active ? "rgba(14,165,233,0.2)" : "transparent"}`,
                cursor: "pointer", transition: "all 0.12s",
              }}>
                <Icon size={13} strokeWidth={active ? 2 : 1.5} style={{ color: active ? "#0ea5e9" : "#64748b" }} />
                <span style={{
                  fontSize: 9, fontWeight: active ? 700 : 500,
                  color: active ? "#0ea5e9" : "#64748b",
                  letterSpacing: "0.1em",
                }}>
                  {item.label.toUpperCase()}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Right side ───────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <NotificationBanner />

        {currentUser ? (
          <>
            {/* Profile chip */}
            <Link href="/profile" style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "4px 10px 4px 6px", borderRadius: 20,
                background: "rgba(14,165,233,0.06)",
                border: "1px solid rgba(14,165,233,0.2)",
                cursor: "pointer", transition: "all 0.12s",
              }}>
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg, #0c1a2e, #1e3a5f)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1.5px solid #bae6fd",
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#C9A55A" }}>
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  {/* Online dot */}
                  <div style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#10b981", border: "1.5px solid #fff",
                  }} />
                </div>
                <div style={{ lineHeight: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#0c1a2e" }}>{currentUser.name}</p>
                  <p style={{ fontSize: 7.5, color: "#94a3b8", marginTop: 1.5, letterSpacing: "0.08em" }}>
                    {currentUser.role === "admin" ? "ADMIN" : currentUser.role === "manager" ? "QUẢN LÝ" : "NHÂN VIÊN"}
                  </p>
                </div>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={logout}
              title="Đăng xuất"
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: "1px solid #fee2e2", background: "#fff5f5",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <LogOut size={12} style={{ color: "#ef4444" }} />
            </button>
          </>
        ) : (
          <Link href="/login" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8, background: "#0ea5e9", cursor: "pointer",
            }}>
              <LogIn size={11} style={{ color: "#fff" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.12em" }}>ĐĂNG NHẬP</span>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
