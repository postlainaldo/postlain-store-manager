"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Focus, Box, Settings, Download, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { id: "overview",      label: "Tổng Quan", href: "/",            icon: LayoutDashboard, exact: true  },
  { id: "visual-board",  label: "Trưng Bày", href: "/visual-board",icon: Focus,           exact: false },
  { id: "chat",          label: "Chat",      href: "/chat",        icon: MessageSquare,   exact: false },
  { id: "inventory",     label: "Kho Hàng",  href: "/inventory",   icon: Box,             exact: false },
  { id: "settings",      label: "Cài Đặt",   href: "/settings",    icon: Settings,        exact: false },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Chỉ hiện banner nếu chưa cài (không phải standalone)
    const alreadyInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (!alreadyInstalled) {
      // Hiện sau 3 giây, không hiện lại nếu user đã dismiss
      const dismissed = sessionStorage.getItem("install-banner-dismissed");
      if (!dismissed) {
        const t = setTimeout(() => setShowInstallBanner(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const dismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("install-banner-dismissed", "1");
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Install mini-banner */}
      {showInstallBanner && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-3 pb-1">
          <div style={{
            background: "#0c1a2e", borderRadius: 12,
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px",
            boxShadow: "0 4px 20px rgba(12,26,46,0.25)",
          }}>
            <span style={{ fontSize: 18 }}>👟</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Cài app POSTLAIN</p>
              <p style={{ fontSize: 9, color: "#7dd3fc", marginTop: 1 }}>Mở nhanh, dùng offline, không cần browser</p>
            </div>
            <Link href="/install" onClick={dismissBanner}
              style={{
                textDecoration: "none", flexShrink: 0,
                background: "#0ea5e9", borderRadius: 8,
                padding: "5px 10px", display: "flex", alignItems: "center", gap: 4,
              }}>
              <Download size={10} color="#fff" />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>Cài</span>
            </Link>
            <button
              onClick={dismissBanner}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2, fontSize: 14, lineHeight: 1 }}
            >×</button>
          </div>
        </div>
      )}

      {/* Nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border flex items-stretch h-16">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 no-underline relative"
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
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-blue" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
