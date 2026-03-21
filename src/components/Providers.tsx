"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Rehydrate Zustand store from localStorage after client mount
    useStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
