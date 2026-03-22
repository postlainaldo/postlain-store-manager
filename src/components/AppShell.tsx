"use client";

import { usePathname } from "next/navigation";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";

const NO_SHELL_PATHS = ["/login", "/setup", "/install"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShellless = NO_SHELL_PATHS.includes(pathname);

  if (isShellless) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      {/* Desktop: TopNav fixed at top, content scrolls below */}
      <div className="hidden md:flex flex-col h-screen w-screen overflow-hidden bg-bg-base">
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-bg-base">
          <div className="max-w-[1440px] mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile: content scrolls, BottomNav fixed at bottom */}
      <div className="md:hidden flex flex-col w-full bg-bg-base" style={{ height: "100dvh" }}>
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden bg-bg-base"
          style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="px-4 pt-4 pb-2">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
