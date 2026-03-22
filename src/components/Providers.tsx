"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";

// ThemeProvider removed — app is locked to Blue Mint light mode.
export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
