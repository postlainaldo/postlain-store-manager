"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Xóa hết data cũ trong localStorage nếu version không khớp
    const CURRENT_VERSION = "3";
    const storedVersion = localStorage.getItem("postlain-auth-version");
    if (storedVersion !== CURRENT_VERSION) {
      // Xóa toàn bộ store cũ để migration chạy sạch
      localStorage.removeItem("postlain-store-v2");
      localStorage.setItem("postlain-auth-version", CURRENT_VERSION);
    }

    useStore.persist.rehydrate();

    // Force-update admin credentials sau rehydrate
    setTimeout(() => {
      const state = useStore.getState();
      const adminUser = state.users.find(u => u.id === "user_admin");
      if (!adminUser || adminUser.email !== "admin" || adminUser.passwordHash !== "Aldo@123") {
        state.updateUser("user_admin", { email: "admin", passwordHash: "Aldo@123" });
      }
      state.fetchDbState();
    }, 0);

    setHydrated(true);
  }, []);

  if (!hydrated) {
    // Blank screen on first frame — prevents flash of unauthenticated content
    return null;
  }

  return <>{children}</>;
}
