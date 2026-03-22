"use client";

import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";

const NO_SHELL_PATHS = ["/login", "/setup", "/install"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShellless = NO_SHELL_PATHS.includes(pathname);

  if (isShellless) {
    // Login page: full-screen, no nav, no auth check needed
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-base text-text-primary">
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-bg-base">
          <div className="max-w-[1440px] mx-auto px-4 py-5 md:px-8 md:py-6 pb-20 md:pb-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
