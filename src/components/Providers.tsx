"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { ThemeProvider } from "./ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
}
