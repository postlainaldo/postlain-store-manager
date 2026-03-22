"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

const PUBLIC_PATHS = ["/login", "/install"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const currentUser = useStore(s => s.currentUser);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!isPublic && !currentUser) {
      router.replace("/login");
    }
    // If logged in and on /login, send them home
    if (isPublic && currentUser) {
      router.replace("/");
    }
  }, [pathname, currentUser, isPublic, router]);

  // Public page (login): always render
  if (isPublic) return <>{children}</>;

  // Protected page: only render when authenticated
  if (!currentUser) return null;

  return <>{children}</>;
}
