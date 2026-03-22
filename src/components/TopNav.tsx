"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Focus, Box, Settings, LogIn, LogOut } from "lucide-react";
import { useStore } from "@/store/useStore";

const NAV_ITEMS = [
  { id: "overview",     label: "Tổng Quan",    href: "/",            icon: LayoutDashboard, exact: true  },
  { id: "visual-board", label: "Trưng Bày",    href: "/visual-board", icon: Focus,           exact: false },
  { id: "inventory",    label: "Kho Hàng",     href: "/inventory",   icon: Box,             exact: false },
  { id: "settings",     label: "Cài Đặt",      href: "/settings",    icon: Settings,        exact: false },
] as const;

export default function TopNav() {
  const pathname = usePathname();
  const storeName = useStore(s => s.storeName);
  const currentUser = useStore(s => s.currentUser);
  const logout = useStore(s => s.logout);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header
      className="hidden md:flex"
      style={{
        flexShrink: 0,
        height: 52,
        background: "#ffffff",
        borderBottom: "1px solid #bae6fd",
        alignItems: "center",
        gap: 0,
        padding: "0 24px",
        boxShadow: "0 1px 4px rgba(12,26,46,0.05)",
        zIndex: 40,
      }}
    >
      {/* Logo mark */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginRight: 28 }}>
        <div
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: "1px solid #C9A55A",
            background: "#f0f9ff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, color: "#C9A55A", letterSpacing: "0.04em" }}>P</span>
        </div>
        <div style={{ lineHeight: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#C9A55A", letterSpacing: "0.5em" }}>POSTLAIN</p>
          <p style={{ fontSize: 6.5, color: "#94a3b8", letterSpacing: "0.22em", marginTop: 3 }}>
            {storeName.split("—")[1]?.trim() || "QUẢN LÝ CỬA HÀNG"}
          </p>
        </div>
      </Link>

      {/* Nav links */}
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
                border: active ? "1px solid rgba(14,165,233,0.2)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.12s",
              }}>
                <Icon size={13} strokeWidth={active ? 2 : 1.5} style={{ color: active ? "#0ea5e9" : "#64748b" }} />
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? "#0ea5e9" : "#64748b", letterSpacing: "0.1em" }}>
                  {item.label.toUpperCase()}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
        {currentUser ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>{currentUser.name.slice(0, 1).toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: "#0ea5e9" }}>{currentUser.name}</span>
            </div>
            <button
              onClick={logout}
              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #bae6fd", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              title="Đăng xuất"
            >
              <LogOut size={12} style={{ color: "#94a3b8" }} />
            </button>
          </>
        ) : (
          <Link href="/login" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "#0ea5e9", cursor: "pointer" }}>
              <LogIn size={11} style={{ color: "#fff" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.1em" }}>ĐĂNG NHẬP</span>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
