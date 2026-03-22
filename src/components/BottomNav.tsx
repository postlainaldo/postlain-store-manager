"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Focus, Box, Layers, Settings } from "lucide-react";

const NAV_ITEMS = [
  { id: "overview",      label: "Tổng Quan",    href: "/",            icon: LayoutDashboard, exact: true  },
  { id: "visual-board",  label: "Trưng Bày",    href: "/visual-board",icon: Focus,           exact: false },
  { id: "inventory",     label: "Kho Hàng",     href: "/inventory",   icon: Box,             exact: false },
  { id: "collections",   label: "Bộ Sưu Tập",   href: "/collections", icon: Layers,          exact: false },
  { id: "settings",      label: "Cài Đặt",      href: "/settings",    icon: Settings,        exact: false },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border flex items-stretch h-16">
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 no-underline"
            style={{ textDecoration: "none" }}
          >
            <Icon
              size={19}
              strokeWidth={active ? 2 : 1.5}
              className={active ? "text-blue" : "text-text-muted"}
            />
            <span
              className="text-[9px] tracking-wider font-medium"
              style={{ color: active ? "var(--blue)" : "var(--text-muted)" }}
            >
              {item.label}
            </span>
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-blue"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
