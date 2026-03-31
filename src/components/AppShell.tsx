"use client";

import { usePathname } from "next/navigation";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationBanner from "@/components/NotificationBanner";

const NO_SHELL_PATHS = ["/login", "/setup", "/install"];

// Pages that need full-height containers (no extra padding, scroll managed inside)
const FULL_HEIGHT_PATHS = ["/chat", "/visual-board"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShellless = NO_SHELL_PATHS.includes(pathname);
  const isFullHeight = FULL_HEIGHT_PATHS.some(p => pathname.startsWith(p));

  if (isShellless) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      {/* ── Desktop: TopNav + scrollable content ──────────────────── */}
      <div className="hidden md:flex flex-col bg-bg-base" style={{ height: "100dvh", overflow: "hidden" }}>
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: "linear-gradient(160deg, #eef6fd 0%, #f0effe 55%, #eef6fd 100%)" }}>
          {isFullHeight ? (
            <div style={{ height: "calc(100vh - 52px)", padding: "12px 24px", display: "flex", flexDirection: "column" }}>
              {children}
            </div>
          ) : (
            <div className="max-w-[1440px] mx-auto px-6 py-6">
              {children}
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile: top bar + scrollable content + bottom nav ─────── */}
      <div className="md:hidden flex flex-col bg-bg-base" style={{ height: "100dvh", overflow: "hidden" }}>
        {/* Mobile top bar */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 12px",
          background: "#080e1a",
          borderBottom: "1px solid rgba(201,165,90,0.18)",
          boxShadow: "0 1px 0 rgba(201,165,90,0.10), 0 2px 12px rgba(8,14,26,0.4)",
          minHeight: 46,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <GlobalSearch />
          </div>
          <NotificationBanner />
        </div>

        {/* Content */}
        {isFullHeight ? (
          /* Full-height pages (chat, visual-board): fill space between top bar and bottom nav */
          <div style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            paddingTop: 10,
            paddingLeft: 12,
            paddingRight: 12,
            paddingBottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
          }}>
            {children}
          </div>
        ) : (
          /* Normal pages: scrollable with padding so content clears bottom nav */
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(160deg, #eef6fd 0%, #f0effe 55%, #eef6fd 100%)" }}
          >
            <div style={{ padding: "12px 14px 8px" }}>
              {children}
            </div>
          </main>
        )}

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
