"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Focus, Box, LogIn, LogOut,
  MessageSquare, ShoppingBag, ClipboardList, CalendarDays,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import NotificationBanner from "@/components/NotificationBanner";
import GlobalSearch from "@/components/GlobalSearch";

const NAV_ITEMS = [
  { id: "overview",     label: "Tổng Quan",  href: "/",             icon: LayoutDashboard, exact: true  },
  { id: "visual-board", label: "Vị Trí",     href: "/visual-board", icon: Focus,           exact: false },
  { id: "inventory",    label: "Dữ Liệu",    href: "/inventory",    icon: Box,             exact: false },
  { id: "sales",        label: "Bán Hàng",   href: "/sales",        icon: ShoppingBag,     exact: false },
  { id: "report",       label: "Báo Cáo",    href: "/report",       icon: ClipboardList,   exact: false },
  { id: "chat",         label: "Chat",        href: "/chat",         icon: MessageSquare,   exact: false },
  { id: "schedule",     label: "Lịch Làm",   href: "/schedule",     icon: CalendarDays,    exact: false },
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
      className="topnav hidden md:flex flex-shrink-0 items-center gap-0"
      style={{ height: 52, padding: "0 20px", zIndex: 40 }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <Link
        href="/"
        style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginRight: 24 }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          border: "1.5px solid rgba(14,165,233,0.35)",
          background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(14,165,233,0.18)",
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#0284c7", letterSpacing: "0.06em" }}>P</span>
        </div>
        <div style={{ lineHeight: 1 }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, color: "#0284c7", letterSpacing: "0.48em" }}>POSTLAIN</p>
          <p style={{ fontSize: 7, color: "rgba(12,26,46,0.38)", letterSpacing: "0.2em", marginTop: 3 }}>
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
            <Link
              key={item.id}
              href={item.href}
              className={`topnav-link${active ? " active" : ""}`}
            >
              <Icon size={13} strokeWidth={active ? 2 : 1.5} className="topnav-icon" />
              <span className="topnav-label">
                {item.label.toUpperCase()}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Right side ───────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <GlobalSearch />
        <NotificationBanner />

        {currentUser ? (
          <>
            {/* Profile chip */}
            <Link href="/profile" style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "4px 10px 4px 6px", borderRadius: 20,
                background: "rgba(14,165,233,0.07)",
                border: "1px solid rgba(14,165,233,0.20)",
                cursor: "pointer",
                transition: "background 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(14,165,233,0.12)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 14px rgba(14,165,233,0.14)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(14,165,233,0.07)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
              >
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1.5px solid rgba(14,165,233,0.35)",
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#0284c7" }}>
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  {/* Online dot */}
                  <div style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#10b981", border: "1.5px solid rgba(255,255,255,0.9)",
                  }} />
                </div>
                <div style={{ lineHeight: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(12,26,46,0.85)" }}>{currentUser.name}</p>
                  <p style={{ fontSize: 7.5, color: "rgba(2,132,199,0.75)", marginTop: 1.5, letterSpacing: "0.08em" }}>
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
                border: "1px solid rgba(239,68,68,0.20)",
                background: "rgba(239,68,68,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.38)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.06)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.20)";
              }}
            >
              <LogOut size={12} style={{ color: "#dc2626" }} />
            </button>
          </>
        ) : (
          <Link href="/login" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8,
              background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(14,165,233,0.3)",
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
