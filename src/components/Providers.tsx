"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useStore.persist.rehydrate();

    // Migrate default admin credentials if old email is still present
    const state = useStore.getState();
    const adminUser = state.users.find(u => u.id === "user_admin");
    if (adminUser && adminUser.email !== "postlain.aldo@gmail.com") {
      state.updateUser("user_admin", {
        email: "postlain.aldo@gmail.com",
        passwordHash: "Lucii@1108",
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
