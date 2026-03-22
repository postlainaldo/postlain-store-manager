"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Xóa data cũ nếu version không khớp
    const CURRENT_VERSION = "3";
    const storedVersion = localStorage.getItem("postlain-auth-version");
    if (storedVersion !== CURRENT_VERSION) {
      localStorage.removeItem("postlain-store-v2");
      localStorage.setItem("postlain-auth-version", CURRENT_VERSION);
    }

    // Rehydrate đồng bộ từ localStorage vào store
    useStore.persist.rehydrate();

    // Sau rehydrate: fix admin credentials nếu cần
    const state = useStore.getState();
    const adminUser = state.users.find(u => u.id === "user_admin");
    if (!adminUser || adminUser.email !== "admin" || adminUser.passwordHash !== "Aldo@123") {
      state.updateUser("user_admin", { email: "admin", passwordHash: "Aldo@123" });
    }

    state.fetchDbState();
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return <>{children}</>;
}
