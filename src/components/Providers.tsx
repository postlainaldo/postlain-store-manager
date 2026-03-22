"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useStore.persist.rehydrate();

    // Đảm bảo admin mặc định luôn dùng credentials hiện tại
    const state = useStore.getState();
    const adminUser = state.users.find(u => u.id === "user_admin");
    if (adminUser && (adminUser.email !== "admin" || adminUser.passwordHash !== "Aldo@123")) {
      state.updateUser("user_admin", {
        email: "admin",
        passwordHash: "Aldo@123",
      });
    }

    // Load fresh DB state (products + warehouse placements) after hydration
    state.fetchDbState();
    setHydrated(true);
  }, []);

  if (!hydrated) {
    // Blank screen on first frame — prevents flash of unauthenticated content
    return null;
  }

  return <>{children}</>;
}
