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
import { useSFX } from "@/hooks/useSFX";

const NAV_ITEMS_BASE = [
  { id: "overview",     label: "Tổng Quan",  href: "/",             icon: LayoutDashboard, exact: true,  adminOnly: false },
  { id: "visual-board", label: "Vị Trí",     href: "/visual-board", icon: Focus,           exact: false, adminOnly: false },
  { id: "inventory",    label: "Dữ Liệu",    href: "/inventory",    icon: Box,             exact: false, adminOnly: false },
  { id: "sales",        label: "Bán Hàng",   href: "/sales",        icon: ShoppingBag,     exact: false, adminOnly: false },
  { id: "report",       label: "Báo Cáo",    href: "/report",       icon: ClipboardList,   exact: false, adminOnly: false },
  { id: "chat",         label: "Chat",       href: "/chat",         icon: MessageSquare,   exact: false, adminOnly: false },
  { id: "schedule",     label: "Lịch Làm",   href: "/schedule",     icon: CalendarDays,    exact: false, adminOnly: false },
] as const;

export default function TopNav() {
  const pathname = usePathname();
  const storeName = useStore(s => s.storeName);
  const currentUser = useStore(s => s.currentUser);
  const logout = useStore(s => s.logout);
  const sfx = useSFX();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";
  const NAV_ITEMS = NAV_ITEMS_BASE.filter(it => !it.adminOnly || isAdmin);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const storeSubtitle = storeName.includes("—")
    ? storeName.split("—")[1]?.trim()
    : storeName;

  return (
    <header
      className="topnav hidden md:flex flex-shrink-0 items-center gap-0"
      style={{ height: 56, padding: "0 20px", zIndex: 40 }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <Link
        href="/"
        style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginRight: 24 }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          border: "1.5px solid rgba(201,165,90,0.45)",
          background: "linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(12,26,46,0.22)",
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#C9A55A", letterSpacing: "0.06em" }}>P</span>
        </div>
        <div style={{ lineHeight: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: "#0c1a2e", letterSpacing: "0.14em" }}>POSTLAIN</p>
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
              onClick={() => sfx("navigate")}
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
                background: "rgba(201,165,90,0.07)",
                border: "1px solid rgba(201,165,90,0.22)",
                cursor: "pointer",
                transition: "background 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(201,165,90,0.13)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 14px rgba(201,165,90,0.16)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(201,165,90,0.07)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
              >
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg, #0c1a2e, #1e3a5f)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1.5px solid rgba(201,165,90,0.45)",
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#C9A55A" }}>
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
                  <p style={{ fontSize: 7.5, color: "rgba(201,165,90,0.80)", marginTop: 1.5, letterSpacing: "0.08em" }}>
                    {currentUser.role === "admin" ? "ADMIN" : currentUser.role === "manager" ? "QUẢN LÝ" : "NHÂN VIÊN"}
                  </p>
                </div>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={() => { sfx("tap"); logout(); }}
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
              background: "linear-gradient(135deg, #0c1a2e, #1e3a5f)",
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(12,26,46,0.30)",
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
