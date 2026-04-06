"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore, sel } from "@/store/useStore";

const PUBLIC_PATHS = ["/login", "/install", "/setup", "/store-select"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname       = usePathname();
  const router         = useRouter();
  const currentUser    = useStore(sel.currentUser);
  const currentStoreId = useStore(sel.currentStoreId);

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    // Nếu chưa chọn store → về store-select (trừ các trang public)
    if (!isPublic && !currentStoreId) {
      router.replace("/store-select");
      return;
    }
    // Chưa đăng nhập → về login
    if (!isPublic && !currentUser) {
      router.replace(`/login?store=${currentStoreId}`);
      return;
    }
    // Đã đăng nhập mà vào /login hay /store-select → về dashboard
    if ((pathname === "/login" || pathname === "/store-select") && currentUser) {
      router.replace("/");
    }
  }, [pathname, currentUser, currentStoreId, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (!currentUser) return null;

  return <>{children}</>;
}
