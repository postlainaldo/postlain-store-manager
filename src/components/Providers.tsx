"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useStore.persist.rehydrate();
    // Give Zustand one tick to apply the persisted state before rendering
    setHydrated(true);
  }, []);

  if (!hydrated) {
    // Blank screen on first frame — prevents flash of unauthenticated content
    return null;
  }

  return <>{children}</>;
}
