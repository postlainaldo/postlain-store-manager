"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Focus, Box, MessageSquare, UserCircle, ShoppingBag, ClipboardList, CalendarDays,
} from "lucide-react";
import { useStore } from "@/store/useStore";

// Same order as TopNav — Profile appended for mobile
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

export default function BottomNav() {
  const pathname = usePathname();
  const currentUser = useStore(s => s.currentUser);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="bottomnav md:hidden"
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "stretch",
        height: `calc(56px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        overflowX: "auto",
      }}
    >
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href, item.exact);
        const Icon = item.icon;
        const isProfile = item.id === "profile";

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`bottomnav-item${active ? " active" : ""}`}
          >
            {/* Active top indicator dot */}
            <span className="bottomnav-dot" />

            {/* Icon */}
            {isProfile && currentUser ? (
              <div
                className="bottomnav-icon"
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: active
                    ? "linear-gradient(135deg, #C9A55A, #A07830)"
                    : "linear-gradient(135deg, #1e3a5f, #0c2a4a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${active ? "rgba(201,165,90,0.6)" : "rgba(255,255,255,0.12)"}`,
                  flexShrink: 0,
                  boxShadow: active ? "0 0 10px rgba(201,165,90,0.3)" : "none",
                }}
              >
                <span style={{ fontSize: 8, fontWeight: 700, color: active ? "#fff" : "#C9A55A" }}>
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            ) : (
              <Icon
                size={18}
                strokeWidth={active ? 2 : 1.5}
                className="bottomnav-icon"
                style={{
                  color: active ? "#C9A55A" : "rgba(255,255,255,0.32)",
                  flexShrink: 0,
                  filter: active ? "drop-shadow(0 0 4px rgba(201,165,90,0.4))" : "none",
                }}
              />
            )}

            <span className="bottomnav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
