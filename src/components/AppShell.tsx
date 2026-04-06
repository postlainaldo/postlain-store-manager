"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationBanner from "@/components/NotificationBanner";
import AudioUnlocker from "@/components/AudioUnlocker";
import PushPrompt from "@/components/PushPrompt";
import AIChatWidget from "@/components/AIChatWidget";
import { useStore } from "@/store/useStore";

const NO_SHELL_PATHS = ["/login", "/setup", "/install", "/store-select"];

// Pages that need full-height containers (no extra padding, scroll managed inside)
const FULL_HEIGHT_PATHS = ["/chat", "/visual-board"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShellless = NO_SHELL_PATHS.includes(pathname);
  const isFullHeight = FULL_HEIGHT_PATHS.some(p => pathname.startsWith(p));

  const currentUser = useStore(s => s.currentUser);

  // Detect mobile after hydration to avoid blur on mobile top bar
  const [isMobileDevice, setIsMobileDevice] = useState(true); // safe default = no blur
  useEffect(() => {
    setIsMobileDevice(/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || window.innerWidth < 768);
  }, []);

  if (isShellless) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <AudioUnlocker />
      <PushPrompt />
      {/* ── Desktop: TopNav + scrollable content ──────────────────── */}
      <div className="hidden md:flex flex-col bg-bg-base transition-colors duration-500" style={{ height: "100dvh", overflow: "hidden" }}>
        <TopNav />
        {isFullHeight ? (
          /* Full-height pages (chat, visual-board): flex fill, scroll managed inside */
          <div className="flex-1 page-bg-aurora" style={{ minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", padding: "12px 24px 16px", position: "relative" }}>
            <div className="page-bg-aurora-mid" />
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
              {children}
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto overflow-x-hidden page-bg-aurora transition-colors duration-500">
            <div className="page-bg-aurora-mid" />
            <div className="max-w-[1440px] mx-auto px-6 py-6" style={{ position: "relative", zIndex: 1 }}>
              {children}
            </div>
          </main>
        )}
      </div>

      {/* ── Mobile: top bar + scrollable content + bottom nav ─────── */}
      <div className="md:hidden flex flex-col bg-bg-base transition-colors duration-500" style={{ height: "100dvh" }}>
        {/* Mobile top bar */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 12px",
          background: isMobileDevice ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.92)",
          backdropFilter: isMobileDevice ? "none" : "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: isMobileDevice ? "none" : "blur(20px) saturate(1.8)",
          borderBottom: "1px solid rgba(12,26,46,0.05)",
          boxShadow: "0 1px 0 rgba(201,165,90,0.10), 0 2px 12px rgba(12,26,46,0.05), inset 0 1px 0 rgba(255,255,255,0.95)",
          minHeight: 52,
          zIndex: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <GlobalSearch />
          </div>
          <NotificationBanner />
        </div>

        {/* Content */}
        {isFullHeight ? (
          /* Full-height pages (chat, visual-board): fill space, scroll managed inside each page */
          <div style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            paddingTop: 10,
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}>
            {children}
          </div>
        ) : (
          /* Normal pages: scrollable — FAB floats over content, no reserved padding needed */
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden page-bg-aurora transition-colors duration-500"
            style={{ paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="page-bg-aurora-mid" />
            <div style={{ padding: "12px 16px 8px", position: "relative", zIndex: 1 }}>
              {children}
            </div>
          </main>
        )}

        <BottomNav />
      </div>

      {/* AI Chat Widget — visible on all authenticated pages */}
      <AIChatWidget currentUser={currentUser} />
    </AuthGuard>
  );
}
