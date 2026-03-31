"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Focus, Box, MessageSquare, UserCircle, ShoppingBag, ClipboardList, CalendarDays,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useSFX } from "@/hooks/useSFX";

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
  const sfx = useSFX();

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
            onClick={() => sfx("navigate")}
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
                    ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                    : "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${active ? "rgba(14,165,233,0.5)" : "rgba(14,165,233,0.22)"}`,
                  flexShrink: 0,
                  boxShadow: active ? "0 0 10px rgba(14,165,233,0.30)" : "none",
                }}
              >
                <span style={{ fontSize: 8, fontWeight: 700, color: active ? "#fff" : "#0284c7" }}>
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            ) : (
              <Icon
                size={18}
                strokeWidth={active ? 2 : 1.5}
                className="bottomnav-icon"
                style={{
                  color: active ? "#0284c7" : "rgba(12,26,46,0.32)",
                  flexShrink: 0,
                  filter: active ? "drop-shadow(0 0 4px rgba(14,165,233,0.35))" : "none",
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
